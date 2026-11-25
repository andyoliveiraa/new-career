import hashlib
import io
import logging
import os
import re
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import yaml
from fastapi import HTTPException

from backend.app.config import settings
from backend.app.firebase import firebase_manager

logger = logging.getLogger(__name__)

MAX_ZIP_FILES = 2000
MAX_ZIP_UNCOMPRESSED_BYTES = 100 * 1024 * 1024  # 100 MB


class CareerOpsImporter:
    @staticmethod
    def _safe_extract_zip(zip_bytes: bytes, target_dir: str) -> None:
        """Safely extract zip archive guarding against Zip Slip and zip bombs."""
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            infolist = z.infolist()
            if len(infolist) > MAX_ZIP_FILES:
                raise HTTPException(status_code=400, detail="Arquivo ZIP excede o número máximo de ficheiros permitido.")

            target_path = os.path.abspath(target_dir)
            total_size = 0
            for member in infolist:
                total_size += max(0, member.file_size)
                if total_size > MAX_ZIP_UNCOMPRESSED_BYTES:
                    raise HTTPException(status_code=400, detail="Arquivo ZIP excede o tamanho máximo descomprimido (100 MB).")

                member_path = os.path.abspath(os.path.join(target_path, member.filename))
                if os.path.commonpath([target_path, member_path]) != target_path:
                    raise HTTPException(status_code=400, detail="Arquivo ZIP inválido ou inseguro (Zip Slip detetado).")

            z.extractall(target_path)

    @classmethod
    async def import_from_zip(cls, zip_bytes: bytes, user_id: str) -> Dict[str, Any]:
        """Import full Career-Ops workspace compressed as a .zip file (Modo Rápido)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                cls._safe_extract_zip(zip_bytes, temp_dir)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erro ao descompactar ficheiro ZIP: {e}")

            extracted_root = temp_dir
            for root, _, files in os.walk(temp_dir):
                if "cv.md" in files or "applications.md" in files or "profile.yml" in files:
                    extracted_root = root
                    break

            return await cls.import_from_directory(extracted_root, user_id)

    @classmethod
    async def import_from_files(
        cls,
        user_id: str,
        cv_content: str,
        profile_content: Optional[str] = None,
        applications_content: Optional[str] = None,
        output_zip_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Import specific individual files (Modo de Privacidade)."""
        if not cv_content or not cv_content.strip():
            raise HTTPException(status_code=400, detail="O ficheiro 'cv.md' é obrigatório como CV Base.")

        user_storage_dir = os.path.join(settings.STORAGE_DIR, "users", user_id)
        user_cvs_dir = os.path.join(user_storage_dir, "cvs")
        os.makedirs(user_cvs_dir, exist_ok=True)

        with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
            f.write(cv_content)

        pdf_filenames = set()
        if output_zip_bytes:
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    cls._safe_extract_zip(output_zip_bytes, temp_dir)
                    for root, _, files in os.walk(temp_dir):
                        for fname in files:
                            if fname.lower().endswith(".pdf"):
                                safe_name = os.path.basename(fname)
                                src = os.path.join(root, fname)
                                dst = os.path.join(user_cvs_dir, safe_name)
                                shutil.copyfile(src, dst)
                                pdf_filenames.add(safe_name)
                except Exception as e:
                    logger.warning(f"Aviso ao extrair PDFs no modo privacidade: {e}")

        profile_data = {}
        if profile_content:
            try:
                profile_data = yaml.safe_load(profile_content) or {}
            except Exception as e:
                logger.warning(f"Aviso ao ler profile_content YAML: {e}")

        user_doc = await firebase_manager.get_user_by_id(user_id) or {}
        prof_dict = cls._build_profile_dict(user_id, profile_data, cv_content, user_doc=user_doc)
        await firebase_manager.save_profile(user_id, prof_dict)

        imported_jobs = 0
        if applications_content:
            imported_jobs = await cls._parse_and_save_applications(
                user_id=user_id,
                applications_text=applications_content,
                master_cv_text=cv_content,
                available_pdfs=pdf_filenames,
                reports_dir=None
            )

        await firebase_manager.update_user(user_id, {"has_completed_onboarding": True})

        return {
            "success": True,
            "message": "Dados importados com sucesso em Modo de Privacidade!",
            "experiences_count": len(prof_dict.get("experiences", [])),
            "educations_count": len(prof_dict.get("educations", [])),
            "skills_count": len(prof_dict.get("skills", [])),
            "jobs_count": imported_jobs,
            "applications_count": imported_jobs,
            "cv_base_loaded": True,
            "profile_name": prof_dict.get("full_name")
        }

    @classmethod
    async def import_from_directory(cls, dir_clean: str, user_id: str) -> Dict[str, Any]:
        """Direct directory scan (used by zip extraction or local directory import)."""
        profile_path = os.path.join(dir_clean, "config", "profile.yml")
        if not os.path.exists(profile_path):
            profile_path = os.path.join(dir_clean, "profile.yml")

        cv_path = os.path.join(dir_clean, "cv.md")
        apps_path = os.path.join(dir_clean, "data", "applications.md")
        if not os.path.exists(apps_path):
            apps_path = os.path.join(dir_clean, "applications.md")

        master_cv_text = ""
        if os.path.exists(cv_path):
            with open(cv_path, "r", encoding="utf-8") as f:
                master_cv_text = f.read()

        user_storage_dir = os.path.join(settings.STORAGE_DIR, "users", user_id)
        user_cvs_dir = os.path.join(user_storage_dir, "cvs")
        os.makedirs(user_cvs_dir, exist_ok=True)
        if master_cv_text:
            with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
                f.write(master_cv_text)

        pdf_filenames = set()
        output_dir = os.path.join(dir_clean, "output")
        if os.path.exists(output_dir):
            for fname in os.listdir(output_dir):
                if fname.lower().endswith(".pdf"):
                    safe_name = os.path.basename(fname)
                    src = os.path.join(output_dir, fname)
                    dst = os.path.join(user_cvs_dir, safe_name)
                    shutil.copyfile(src, dst)
                    pdf_filenames.add(safe_name)

        profile_data = {}
        if os.path.exists(profile_path):
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    profile_data = yaml.safe_load(f) or {}
            except Exception as e:
                logger.warning(f"Aviso ao ler profile.yml: {e}")

        user_doc = await firebase_manager.get_user_by_id(user_id) or {}
        prof_dict = cls._build_profile_dict(user_id, profile_data, master_cv_text, user_doc=user_doc)
        await firebase_manager.save_profile(user_id, prof_dict)

        apps_content = ""
        if os.path.exists(apps_path):
            with open(apps_path, "r", encoding="utf-8") as f:
                apps_content = f.read()

        reports_dir = os.path.join(dir_clean, "reports")
        imported_jobs = await cls._parse_and_save_applications(
            user_id=user_id,
            applications_text=apps_content,
            master_cv_text=master_cv_text,
            available_pdfs=pdf_filenames,
            reports_dir=reports_dir if os.path.exists(reports_dir) else None
        )

        await firebase_manager.update_user(user_id, {"has_completed_onboarding": True})

        return {
            "success": True,
            "message": "Dados do Career-Ops importados com sucesso!",
            "experiences_count": len(prof_dict.get("experiences", [])),
            "educations_count": len(prof_dict.get("educations", [])),
            "skills_count": len(prof_dict.get("skills", [])),
            "jobs_count": imported_jobs,
            "applications_count": imported_jobs,
            "cv_base_loaded": bool(master_cv_text),
            "profile_name": prof_dict.get("full_name")
        }

    @staticmethod
    def _parse_cv_markdown(cv_text: str) -> Dict[str, Any]:
        """Extract name, summary, experiences, educations, and skills dynamically from cv.md."""
        parsed: Dict[str, Any] = {
            "full_name": None,
            "summary": None,
            "experiences": [],
            "educations": [],
            "skills": [],
            "languages": [],
        }
        if not cv_text or not cv_text.strip():
            return parsed

        lines = [ln.strip() for ln in cv_text.splitlines()]
        section = "header"
        current_exp: Optional[Dict[str, Any]] = None
        current_period = ""
        current_location = ""
        date_line_re = re.compile(r"^(\d{2}/\d{2}/\d{4}\s*-\s*(?:\d{2}/\d{2}/\d{4}|presente|atual)|(?:\d{4}\s*-\s*(?:\d{4}|presente|atual)))(?:\s*-\s*(.+))?$", re.IGNORECASE)

        def _flush_exp():
            nonlocal current_exp
            if current_exp and (current_exp.get("role") or current_exp.get("bullets")):
                parsed["experiences"].append(current_exp)
            current_exp = None

        for raw in lines:
            if not raw:
                continue
            low = raw.lower()

            if raw.startswith("#") and not parsed["full_name"] and section == "header":
                parsed["full_name"] = raw.lstrip("#").strip()
                continue

            if "experiência profissional" in low or "professional experience" in low or low == "## experience":
                _flush_exp()
                section = "experience"
                continue
            if "educação e formação" in low or "formação académica" in low or "education" in low and raw.startswith("#"):
                _flush_exp()
                section = "education"
                continue
            if ("competências" in low or "skills" in low) and raw.startswith("#"):
                _flush_exp()
                section = "skills"
                continue
            if ("idiomas" in low or "languages" in low) and raw.startswith("#"):
                _flush_exp()
                section = "languages"
                continue

            if section == "experience":
                dm = date_line_re.match(raw)
                if dm:
                    _flush_exp()
                    current_period = dm.group(1).strip()
                    current_location = (dm.group(2) or "").strip()
                    continue

                if raw.startswith("## ") and not any(k in low for k in ("liderança", "desenvolvimento", "funções", "responsabilidades")):
                    _flush_exp()
                    heading = raw.lstrip("#").strip()
                    role = heading
                    company = ""
                    for sep in (" — ", " - ", " | ", " @ "):
                        if sep in heading:
                            role, company = [p.strip() for p in heading.split(sep, 1)]
                            break
                    current_exp = {
                        "role": role,
                        "company": company,
                        "period": current_period,
                        "location": current_location,
                        "bullets": []
                    }
                    continue

                if raw.startswith(("- ", "* ")) and current_exp is not None:
                    current_exp["bullets"].append(raw[2:].strip())

            elif section == "education":
                if raw.startswith("## "):
                    parsed["educations"].append({
                        "degree": raw.lstrip("#").strip(),
                        "institution": "",
                        "period": current_period or ""
                    })
                elif date_line_re.match(raw):
                    current_period = raw
                elif raw.startswith(("- ", "* ")) and parsed["educations"] and not parsed["educations"][-1]["institution"]:
                    parsed["educations"][-1]["institution"] = raw[2:].strip()

            elif section == "skills":
                if raw.startswith(("- ", "* ")):
                    item = raw[2:].strip()
                    for token in re.split(r"[,;|]", item):
                        t = token.strip()
                        if t and len(t) <= 60:
                            parsed["skills"].append(t)
                elif not raw.startswith("#"):
                    for token in re.split(r"[,;|]", raw):
                        t = token.strip()
                        if t and len(t) <= 60:
                            parsed["skills"].append(t)

            elif section == "languages":
                if raw.startswith(("- ", "* ")):
                    lang_txt = raw[2:].strip()
                    if ":" in lang_txt:
                        name, level = [p.strip() for p in lang_txt.split(":", 1)]
                        parsed["languages"].append({"name": name, "level": level})
                    else:
                        parsed["languages"].append({"name": lang_txt, "level": "Profissional"})

        _flush_exp()
        return parsed

    @classmethod
    def _build_profile_dict(
        cls,
        user_id: str,
        profile_data: Dict[str, Any],
        cv_text: str,
        user_doc: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Build a clean, user-owned profile dictionary strictly from profile.yml and cv.md."""
        candidate = profile_data.get("candidate") or {}
        narrative = profile_data.get("narrative") or {}
        target_roles = profile_data.get("target_roles") or {}
        cv_parsed = cls._parse_cv_markdown(cv_text)
        user_info = user_doc or {}

        # Skills: merge explicit profile.yml skills, superpowers/target roles, and cv.md skills
        raw_skills: List[str] = []
        for src in (
            profile_data.get("skills"),
            candidate.get("skills"),
            narrative.get("superpowers"),
            target_roles.get("primary"),
            cv_parsed.get("skills"),
        ):
            if isinstance(src, list):
                for item in src:
                    if isinstance(item, str) and item.strip():
                        raw_skills.append(item.strip())
                    elif isinstance(item, dict) and item.get("name"):
                        raw_skills.append(str(item["name"]).strip())

        dedup_skills: List[str] = []
        seen_skills = set()
        for sk in raw_skills:
            low = sk.lower()
            if low not in seen_skills:
                seen_skills.add(low)
                dedup_skills.append(sk)

        # Experiences & Educations from profile.yml or parsed cv.md
        experiences = profile_data.get("experiences") or candidate.get("experiences") or cv_parsed.get("experiences") or []
        educations = profile_data.get("educations") or candidate.get("educations") or cv_parsed.get("educations") or []
        certifications = profile_data.get("certifications") or []
        projects = profile_data.get("projects") or []
        languages = profile_data.get("languages") or cv_parsed.get("languages") or []
        verified_facts = profile_data.get("verified_facts") or narrative.get("proof_points") or []

        full_name = candidate.get("full_name") or cv_parsed.get("full_name") or user_info.get("full_name") or "Utilizador"
        email = candidate.get("email") or user_info.get("email") or ""
        phone = candidate.get("phone") or ""
        location = candidate.get("location") or settings.DEFAULT_CITY
        headline = narrative.get("headline") or candidate.get("title") or "Profissional em Procura Ativa"
        summary = narrative.get("exit_story") or profile_data.get("summary") or (
            f"Perfil profissional importado do Career-Ops para {full_name}."
        )

        return {
            "id": 1,
            "user_id": user_id,
            "full_name": full_name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": candidate.get("linkedin") or None,
            "github_url": candidate.get("github") or None,
            "portfolio_url": candidate.get("portfolio_url") or None,
            "summary": summary,
            "skills": dedup_skills,
            "experiences": experiences,
            "educations": educations,
            "certifications": certifications,
            "projects": projects,
            "languages": languages,
            "verified_facts": verified_facts if isinstance(verified_facts, list) else [],
            "master_cv_text": cv_text
        }

    @staticmethod
    async def _parse_and_save_applications(
        user_id: str,
        applications_text: str,
        master_cv_text: str,
        available_pdfs: set,
        reports_dir: Optional[str] = None
    ) -> int:
        if not applications_text:
            return 0

        lines = applications_text.splitlines()
        row_pattern = re.compile(
            r"^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*\[([^\]]+)\]\(([^)]+)\)"
        )

        imported_jobs = 0
        for line in lines:
            m = row_pattern.match(line.strip())
            if not m:
                continue

            app_num = int(m.group(1).strip())
            date_str = m.group(2).strip()
            company = m.group(3).strip()
            via = m.group(4).strip()
            role = m.group(5).strip()
            score_str = m.group(6).strip()
            report_raw = m.group(9).strip()
            notes = m.group(10).strip()
            job_url = m.group(12).strip()

            if company == "?" and via != "—":
                company = via

            score_val = None
            if "/" in score_str:
                try:
                    num, den = score_str.split("/")
                    score_val = round((float(num) / float(den)) * 100, 1)
                except Exception:
                    pass

            source = "web"
            if "net-empregos.com" in job_url:
                source = "netempregos"
            elif "linkedin.com" in job_url:
                source = "linkedin"
            elif "indeed.com" in job_url:
                source = "indeed"
            elif "greenhouse.io" in job_url:
                source = "greenhouse"
            elif "lever.co" in job_url:
                source = "lever"
            elif "ashbyhq.com" in job_url:
                source = "ashby"

            try:
                app_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                app_date = datetime.now(timezone.utc).isoformat()

            job_key = hashlib.sha256(f"{source}:{job_url}".encode()).hexdigest()[:24]

            description = None
            if reports_dir:
                rep_match = re.search(r'\[([^\]]+)\]\(\.\./reports/([^)]+)\)', report_raw)
                if rep_match:
                    rep_filename = os.path.basename(rep_match.group(2))
                    rep_path = os.path.join(reports_dir, rep_filename)
                    if os.path.exists(rep_path):
                        with open(rep_path, "r", encoding="utf-8") as rf:
                            description = rf.read()[:4000]

            custom_cv_path = None
            app_pad = f"{app_num:03d}"
            for pdf_name in available_pdfs:
                if f"-{app_pad}-" in pdf_name or f"_{app_num}." in pdf_name:
                    custom_cv_path = f"/api/ai/download-pdf/{pdf_name}"
                    break

            is_remote_val = "teletrabalho" in notes.lower() or "remoto" in notes.lower() or "remoto" in role.lower() or "remote" in role.lower()
            loc_val = "Remoto" if is_remote_val else settings.DEFAULT_COUNTRY

            final_status = "candidatado" if "candidat" in notes.lower() else "avaliada"
            if "aguarda envio" in notes.lower() or "candidatura" in notes.lower():
                final_status = "candidatado"

            job_dict = {
                "id": app_num,
                "job_key": job_key,
                "title": role,
                "company": company,
                "location": loc_val,
                "is_remote": is_remote_val,
                "salary": None,
                "description": description or f"Vaga importada do Career-Ops: {role} em {company}",
                "url": job_url,
                "source": source,
                "liveness_status": "active",
                "distance_km": 0.0 if is_remote_val else None,
                "published_at": app_date,
                "created_at": app_date,
                "application_status": final_status,
                "match_score": score_val or 85.0
            }
            await firebase_manager.save_job(user_id, job_dict)

            app_dict = {
                "id": app_num,
                "job_id": app_num,
                "status": final_status,
                "match_score": score_val or 85.0,
                "match_summary": f"Importado do Career-Ops. Avaliação com Score {score_str}.",
                "pros": "",
                "gaps": "",
                "applied_at": app_date if final_status == "candidatado" else None,
                "custom_cv_path": custom_cv_path,
                "custom_cover_letter": None,
                "custom_cv_text": master_cv_text,
                "notes": notes,
                "created_at": app_date
            }
            await firebase_manager.save_application(user_id, app_num, app_dict)
            imported_jobs += 1

        return imported_jobs
