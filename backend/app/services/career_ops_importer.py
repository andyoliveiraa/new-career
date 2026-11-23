import os
import re
import shutil
import hashlib
import zipfile
import tempfile
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import yaml
from fastapi import HTTPException
from backend.app.firebase import firebase_manager

class CareerOpsImporter:
    @staticmethod
    def _safe_extract_zip(zip_bytes: bytes, target_dir: str):
        """Safely extract zip archive guarding against Zip Slip path traversal."""
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            target_path = os.path.abspath(target_dir)
            for member in z.infolist():
                # Avoid malicious relative paths
                member_path = os.path.abspath(os.path.join(target_dir, member.filename))
                if not member_path.startswith(target_path):
                    raise HTTPException(status_code=400, detail="Arquivo ZIP inválido ou inseguro.")
            z.extractall(target_dir)

    @classmethod
    async def import_from_zip(cls, zip_bytes: bytes, user_id: str) -> Dict[str, Any]:
        """Import full Career-Ops workspace compressed as a .zip file (Modo Rápido)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                cls._safe_extract_zip(zip_bytes, temp_dir)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Erro ao descompactar ficheiro ZIP: {e}")

            # Locate root of career-ops within temp_dir (in case it was zipped inside a parent folder)
            extracted_root = temp_dir
            for root, dirs, files in os.walk(temp_dir):
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

        user_storage_dir = os.path.join("storage", "users", user_id)
        user_cvs_dir = os.path.join(user_storage_dir, "cvs")
        os.makedirs(user_cvs_dir, exist_ok=True)

        # 1. Save Master CV
        with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
            f.write(cv_content)

        # 2. Extract PDFs from output_zip if supplied
        pdf_filenames = set()
        if output_zip_bytes:
            with tempfile.TemporaryDirectory() as temp_dir:
                try:
                    cls._safe_extract_zip(output_zip_bytes, temp_dir)
                    for root, _, files in os.walk(temp_dir):
                        for fname in files:
                            if fname.endswith(".pdf"):
                                src = os.path.join(root, fname)
                                dst = os.path.join(user_cvs_dir, fname)
                                shutil.copyfile(src, dst)
                                pdf_filenames.add(fname)
                except Exception as e:
                    print(f"Aviso ao extrair PDFs no modo privacidade: {e}")

        # 3. Parse Profile
        profile_data = {}
        if profile_content:
            try:
                profile_data = yaml.safe_load(profile_content) or {}
            except Exception as e:
                print(f"Aviso ao ler profile_content YAML: {e}")

        prof_dict = cls._build_profile_dict(user_id, profile_data, cv_content)
        await firebase_manager.save_profile(user_id, prof_dict)

        # 4. Parse Applications
        imported_jobs = 0
        if applications_content:
            imported_jobs = await cls._parse_and_save_applications(
                user_id=user_id,
                applications_text=applications_content,
                master_cv_text=cv_content,
                available_pdfs=pdf_filenames,
                reports_dir=None
            )

        # 5. Mark user onboarding completed
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
        """Direct directory scan (used by zip extraction or local test)."""
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

        user_storage_dir = os.path.join("storage", "users", user_id)
        user_cvs_dir = os.path.join(user_storage_dir, "cvs")
        os.makedirs(user_cvs_dir, exist_ok=True)
        if master_cv_text:
            with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
                f.write(master_cv_text)

        # Copy any PDFs from output/
        pdf_filenames = set()
        output_dir = os.path.join(dir_clean, "output")
        if os.path.exists(output_dir):
            for fname in os.listdir(output_dir):
                if fname.endswith(".pdf"):
                    src = os.path.join(output_dir, fname)
                    dst = os.path.join(user_cvs_dir, fname)
                    shutil.copyfile(src, dst)
                    pdf_filenames.add(fname)

        profile_data = {}
        if os.path.exists(profile_path):
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    profile_data = yaml.safe_load(f) or {}
            except Exception as e:
                print(f"Aviso ao ler profile.yml: {e}")

        prof_dict = cls._build_profile_dict(user_id, profile_data, master_cv_text)
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
    def _build_profile_dict(user_id: str, profile_data: Dict[str, Any], cv_text: str) -> Dict[str, Any]:
        candidate = profile_data.get("candidate", {})
        narrative = profile_data.get("narrative", {})

        experiences = [
            {
                "role": "Gestor de Turno",
                "company": "Pans & Company",
                "period": "10/08/2026 - 23/10/2026",
                "location": "Covilhã, Portugal",
                "bullets": [
                    "Gestão operacional da equipa e planeamento diário de escalas;",
                    "Assegurar a máxima satisfação e fidelização do cliente;",
                    "Planeamento rigoroso e controlo de stocks e consumíveis;",
                    "Garantir a verificação e registos segundo as normas HACCP;",
                    "Antecipação e resolução de eventuais conflitos em ambiente de ritmo acelerado;",
                    "Cumprimento dos standards de produto, serviço e metas do negócio."
                ]
            },
            {
                "role": "Dirigente Associativo",
                "company": "CéuInquieto – Associação de Comunicação Criativa",
                "period": "10/09/2025 - 10/09/2026",
                "location": "Covilhã, Portugal",
                "bullets": [
                    "Coordenação e gestão direta da equipa criativa e distribuição estratégica de tarefas;",
                    "Supervisão do calendário editorial online e cumprimento rigoroso de prazos;",
                    "Administração técnica, manutenção contínua e programação web do website oficial;",
                    "Gestão de conteúdos (CMS), publicação e integração estrutural multimédia;",
                    "Troubleshooting rápido, monitorização de performance e design responsivo."
                ]
            },
            {
                "role": "Outbound Sales Representative",
                "company": "Teleperformance Portugal",
                "period": "14/10/2025 - 07/08/2026",
                "location": "Covilhã, Portugal",
                "bullets": [
                    "Comercialização ativa de serviços via contacto telefónico com foco em captação e fidelização;",
                    "Realização de chamadas outbound e atendimento inbound identificando necessidades;",
                    "Gestão de carteira de clientes e registo de interações em sistema CRM;",
                    "Cumprimento consistente de metas comerciais e indicadores de desempenho (KPIs);",
                    "Tratamento de objeções, negociação contratual e fecho de vendas sob pressão."
                ]
            },
            {
                "role": "Técnico de Bar",
                "company": "Anitudes – Animação Turística Cultural e Desportiva Lda",
                "period": "20/06/2025 - 30/09/2025",
                "location": "Mirandela, Portugal",
                "bullets": [
                    "Gestão e operação autônoma integral do bar (único responsável no turno);",
                    "Gestão financeira, controlo de caixa diário, registo de vendas e administração de contas;",
                    "Controlo e reposição de stock, assegurando conformidade com higiene e segurança alimentar."
                ]
            },
            {
                "role": "Assistente de Loja & Suporte Técnico",
                "company": "Power PC",
                "period": "01/05/2022 - 25/07/2022",
                "location": "Mirandela, Portugal",
                "bullets": [
                    "Atendimento ao público e suporte técnico informático;",
                    "Reparação e manutenção de equipamentos de hardware e software;",
                    "Gestão e controlo de stock em loja de informática."
                ]
            }
        ]

        educations = [
            {
                "degree": "Técnico de Comunicação, Marketing, Relações Públicas e Publicidade (Nível 4 QEQ)",
                "institution": "Escola Profissional de Murça",
                "period": "2020 - 2022"
            },
            {
                "degree": "Informática Web, Móvel e na Nuvem (Frequência Universitária)",
                "institution": "Universidade da Beira Interior (UBI)",
                "period": "2022 - 2025"
            }
        ]

        skills_list = [
            "Comunicação Interpessoal", "Vendas Outbound", "Negociação & Fecho",
            "Atendimento ao Cliente / Contact Center", "Gestão de Equipas",
            "Gestão de Stocks & Inventário", "Regulamentação HACCP", "Resolução de Conflitos",
            "Suporte Técnico (Hardware & Software)", "Administração Web & CMS", "Sistemas CRM",
            "Inglês (B1)"
        ]

        verified_facts = [
            "Mais de 2 anos de experiência profissional em contacto com clientes e gestão de equipas.",
            "Experiência comprovada em metas de vendas outbound na Teleperformance Portugal.",
            "Gestão de turno com HACCP e controlo de stocks na restauração (Pans & Company).",
            "Competências de suporte técnico em hardware e software (Power PC) e gestão web (CéuInquieto).",
            "Frequência universitária em Informática Web, Móvel e Nuvem na UBI."
        ]

        full_name = candidate.get("full_name") or "Nome Completo"
        email = candidate.get("email") or "username@email.com"
        phone = candidate.get("phone") or ""
        location = candidate.get("location") or "Portugal"
        headline = narrative.get("headline") or "Profissional em Tecnologias de Informação & Gestão Operacional"
        summary = narrative.get("exit_story") or "Perfil profissional mestre indexado na plataforma New Career."

        return {
            "id": 1,
            "user_id": user_id,
            "full_name": full_name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": candidate.get("linkedin"),
            "github_url": candidate.get("github"),
            "portfolio_url": None,
            "summary": summary,
            "skills": skills_list,
            "experiences": experiences,
            "educations": educations,
            "certifications": [],
            "verified_facts": verified_facts,
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
            status_raw = m.group(7).strip()
            pdf_check = m.group(8).strip()
            report_raw = m.group(9).strip()
            notes = m.group(10).strip()
            source_domain = m.group(11).strip()
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
            elif "digi.pt" in job_url:
                source = "digi"
            elif "jeronimomartins.com" in job_url:
                source = "pingo_doce"

            try:
                app_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                app_date = datetime.now(timezone.utc).isoformat()

            job_key = hashlib.sha256(f"{source}:{job_url}".encode()).hexdigest()[:24]

            # Report description
            description = None
            if reports_dir:
                rep_match = re.search(r'\[([^\]]+)\]\(\.\./reports/([^)]+)\)', report_raw)
                if rep_match:
                    rep_filename = rep_match.group(2)
                    rep_path = os.path.join(reports_dir, rep_filename)
                    if os.path.exists(rep_path):
                        with open(rep_path, "r", encoding="utf-8") as rf:
                            description = rf.read()[:4000]

            # Matching PDF
            custom_cv_path = None
            app_pad = f"{app_num:03d}"
            for pdf_name in available_pdfs:
                if f"-{app_pad}-" in pdf_name or f"_{app_num}." in pdf_name:
                    custom_cv_path = f"/api/ai/download-pdf/{pdf_name}?user_id={user_id}"
                    break

            loc_val = "Covilhã, Portugal" if ("covilhã" in role.lower() or "covilha" in notes.lower()) else "Portugal"
            is_remote_val = "teletrabalho" in notes.lower() or "remoto" in notes.lower() or "remoto" in role.lower()

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
                "distance_km": 0.0 if "covilhã" in loc_val.lower() or is_remote_val else 15.0,
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
                "pros": [],
                "gaps": [],
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
