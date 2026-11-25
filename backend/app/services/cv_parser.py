import io
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from docx import Document
from fastapi import HTTPException
from markdownify import markdownify as html_to_markdown
from pypdf import PdfReader

from backend.app.services.ai_tailor import AITailorService, _strip_json_fences

logger = logging.getLogger(__name__)

MAX_CV_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".markdown", ".txt", ".html", ".htm"}

SECTION_ALIASES: Dict[str, Tuple[str, ...]] = {
    "summary": (
        "summary", "professional summary", "profile", "about", "about me", "objective",
        "resumo", "resumo profissional", "sobre", "sobre mim", "perfil",
        "resumen", "perfil profesional", "zusammenfassung", "profil", "über mich",
    ),
    "experience": (
        "experience", "work experience", "professional experience", "employment", "career history",
        "experiência", "experiencia", "experiência profissional", "experiencia profesional",
        "berufserfahrung", "erfahrung",
    ),
    "education": (
        "education", "education and training", "academic background", "qualifications",
        "educação", "educacao", "educação e formação", "educacao e formacao",
        "formação", "formacao", "formação académica", "formacao academica",
        "habilitações", "habilitacoes", "habilitações e formação", "habilitacoes e formacao",
        "habilitações académicas", "habilitacoes academicas", "habilitações literárias", "habilitacoes literarias",
        "educación", "formación", "formación académica", "ausbildung", "studium", "schulbildung",
    ),
    "skills": (
        "skills", "technical skills", "core competencies", "technologies", "tech stack",
        "competências", "competencias", "competências técnicas", "competencias tecnicas",
        "competências digitais", "competencias digitais",
        "habilidades", "fähigkeiten", "kenntnisse",
    ),
    "projects": (
        "projects", "featured projects", "key projects", "projetos", "proyectos", "projekte",
    ),
    "certifications": (
        "certifications", "licenses", "certificates", "certificações", "certificacoes",
        "certificaciones", "zertifikate",
    ),
    "languages": (
        "languages", "competências linguísticas", "competencias linguisticas",
        "idiomas", "línguas", "linguas", "sprachen",
    ),
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?")
URL_RE = re.compile(r"https?://[^\s<>()\"']+|(?:www\.)?[a-z0-9.-]+\.(?:com|io|dev|org|net|pt|de|es|ai)/[^\s<>()\"']*", re.IGNORECASE)
DATE_RANGE_RE = re.compile(
    r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|fev|abr|mai|ago|set|out|dez|ene|mär|okt)?\.?\s*\d{4}\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|fev|abr|mai|ago|set|out|dez|ene|mär|okt)?\.?\s*\d{4}|present|presente|atual|actual|current|heute|now)|\d{2}/\d{2}/\d{4}\s*[-–—]\s*(?:\d{2}/\d{2}/\d{4}|present|presente|atual))",
    re.IGNORECASE,
)


class CVParserService:
    """Extracts text from uploaded CV files, converts to Markdown, and parses structured profile fields."""

    @staticmethod
    def extract_text_from_bytes(filename: str, content: bytes) -> Tuple[str, str]:
        """Extract text (and optional pre-markdown) from PDF, DOCX, MD, TXT, or HTML."""
        if not content:
            raise HTTPException(status_code=400, detail="O ficheiro enviado está vazio.")
        if len(content) > MAX_CV_FILE_BYTES:
            raise HTTPException(status_code=400, detail="O ficheiro excede o limite máximo de 15 MB.")

        ext = os.path.splitext((filename or "").strip().lower())[1]
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Formato não suportado. Envie um ficheiro PDF, DOCX, MD, TXT ou HTML.",
            )

        if ext in {".md", ".markdown", ".txt"}:
            text = content.decode("utf-8", errors="replace").replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "").strip()
            if not text:
                raise HTTPException(status_code=400, detail="Não foi possível ler texto do ficheiro enviado.")
            return text, ext

        if ext in {".html", ".htm"}:
            html_str = content.decode("utf-8", errors="replace").replace("\u00a0", " ")
            md = html_to_markdown(html_str, heading_style="ATX").strip()
            if not md:
                raise HTTPException(status_code=400, detail="O ficheiro HTML não contém conteúdo legível.")
            return md, ext

        if ext == ".pdf":
            try:
                reader = PdfReader(io.BytesIO(content))
                pages = [(page.extract_text() or "").replace("\u00a0", " ").replace("\u200b", "").strip() for page in reader.pages]
                text = "\n\n".join(p for p in pages if p).strip()
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Erro ao ler PDF: {exc}")
            if not text:
                raise HTTPException(
                    status_code=400,
                    detail="Não foi possível extrair texto do PDF (verifique se não é apenas uma imagem digitalizada).",
                )
            return text, ext

        # .docx
        try:
            doc = Document(io.BytesIO(content))
            lines: List[str] = []
            for para in doc.paragraphs:
                txt = (para.text or "").strip()
                if not txt:
                    continue
                style_name = (para.style.name or "").lower() if para.style else ""
                if "heading 1" in style_name or style_name == "title":
                    lines.append(f"# {txt}")
                elif "heading" in style_name:
                    lines.append(f"## {txt}")
                elif "list" in style_name:
                    lines.append(f"- {txt}")
                else:
                    lines.append(txt)
            for table in doc.tables:
                for row in table.rows:
                    cells = [c.text.strip().replace("\n", " ") for c in row.cells if c.text.strip()]
                    if cells:
                        lines.append(" | ".join(cells))
            text = "\n".join(lines).replace("\u00a0", " ").replace("\u200b", "").strip()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Erro ao ler documento DOCX: {exc}")

        if not text:
            raise HTTPException(status_code=400, detail="O documento DOCX está vazio.")
        return text, ext

    @staticmethod
    def _match_section(line: str) -> Optional[str]:
        clean = re.sub(r"^[#*\-\s•·]+|[:\s]+$", "", line)
        clean = re.sub(r"\s+", " ", clean).strip().lower()
        if not clean or len(clean) > 55:
            return None
        for sec, aliases in SECTION_ALIASES.items():
            if clean in aliases:
                return sec
        return None

    @staticmethod
    def _looks_like_location(text: str) -> bool:
        clean = text.strip(" -|•—()")
        if not clean or len(clean) > 60:
            return False
        low = clean.lower()
        non_location_tokens = (
            "engineer", "developer", "diretor", "director", "manager", "lead", "intern",
            "estágio", "estagio", "coordenador", "analista", "técnico", "tecnico",
            "bsc", "msc", "licenciatura", "mestrado", "curso", "universidade",
            "university", "instituto", "institute", "escola", "school", "associação", "associacao",
        )
        if any(tok in low for tok in non_location_tokens):
            return False
        if low in {"remote", "remoto", "portugal", "spain", "espanha", "germany", "alemanha", "france", "uk", "usa"}:
            return True
        return "," in clean and len(clean.split(",")) <= 3

    @classmethod
    def _normalize_to_markdown(cls, raw_text: str, ext: str) -> str:
        """Convert plain or semi-structured CV text into clean Markdown."""
        if ext in {".md", ".markdown", ".html", ".htm"}:
            return re.sub(r"\n{3,}", "\n\n", raw_text).strip()

        out_lines: List[str] = []
        raw_lines = [ln.rstrip() for ln in raw_text.splitlines()]
        first_non_empty_done = False

        for ln in raw_lines:
            stripped = ln.strip()
            if not stripped:
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                continue

            if not first_non_empty_done:
                first_non_empty_done = True
                out_lines.append(stripped if stripped.startswith("#") else f"# {stripped}")
                continue

            matched_sec = cls._match_section(stripped)
            if matched_sec:
                heading_title = re.sub(r"^[#*\-\s]+|[:\s]+$", "", stripped).strip()
                out_lines.append(f"\n## {heading_title}")
                continue

            if stripped[0] in ("•", "●", "▪", "◦", "–", "*"):
                bullet_text = stripped[1:].strip()
                if bullet_text:
                    out_lines.append(f"- {bullet_text}")
                continue

            out_lines.append(stripped)

        return re.sub(r"\n{3,}", "\n\n", "\n".join(out_lines)).strip()

    @classmethod
    def _heuristic_extract(cls, md_text: str, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic multi-language profile extraction from Markdown CV text."""
        lines = [ln.strip() for ln in md_text.splitlines() if ln.strip()]
        full_text = "\n".join(lines)

        email_match = EMAIL_RE.search(full_text)
        email = email_match.group(0) if email_match else user_doc.get("email", "")

        phone = ""
        for ln in lines[:12]:
            cleaned_ln = EMAIL_RE.sub("", ln)
            pm = PHONE_RE.search(cleaned_ln)
            if pm and sum(c.isdigit() for c in pm.group(0)) >= 8:
                phone = pm.group(0).strip()
                break

        linkedin_url = None
        github_url = None
        portfolio_url = None
        for um in URL_RE.finditer(full_text):
            u = um.group(0).rstrip(".,;)")
            if not u.lower().startswith("http"):
                u = f"https://{u}"
            low_u = u.lower()
            if "linkedin.com" in low_u and not linkedin_url:
                linkedin_url = u
            elif "github.com" in low_u and not github_url:
                github_url = u
            elif not portfolio_url and "linkedin.com" not in low_u and "github.com" not in low_u:
                portfolio_url = u

        full_name = user_doc.get("full_name", "")
        headline = ""
        location = ""
        header_lines: List[str] = []
        for ln in lines[:10]:
            if cls._match_section(ln):
                break
            header_lines.append(ln)

        if header_lines:
            cand_name = header_lines[0].lstrip("#").strip()
            if cand_name and len(cand_name) <= 70 and "@" not in cand_name:
                full_name = cand_name
            for hl in header_lines[1:5]:
                plain = hl.lstrip("#").strip()
                if not plain:
                    continue
                if not headline and "@" not in plain and "http" not in plain.lower() and not PHONE_RE.fullmatch(plain):
                    headline = plain[:120]
                    continue
                if not location and any(tok in plain.lower() for tok in ("lisboa", "porto", "remote", "remoto", "london", "berlin", "madrid", "portugal", "spain", "germany", "uk", "usa")):
                    location = plain.split("|")[0].split("•")[0].strip()[:80]

        sections: Dict[str, List[str]] = {
            "summary": [], "experience": [], "education": [],
            "skills": [], "projects": [], "certifications": [], "languages": [],
        }
        current_sec: Optional[str] = None
        for ln in lines:
            sec = cls._match_section(ln)
            if sec:
                current_sec = sec
                continue
            if current_sec:
                sections[current_sec].append(ln)

        summary = " ".join(
            ln.lstrip("#- ").strip() for ln in sections["summary"] if not ln.startswith("#")
        ).strip()

        skills: List[str] = []
        for ln in sections["skills"]:
            clean_ln = re.sub(r"^[-*•●▪◦]\s*", "", ln)
            clean_ln = re.sub(r"^[A-Za-zÀ-ÿ\s/&]+:\s*", "", clean_ln)
            for tok in re.split(r"[,;|•·●▪]", clean_ln):
                skill = tok.strip(" .")
                if skill and (len(skill) > 1 or skill.upper() in {"C", "R"}) and len(skill) <= 50 and skill not in skills:
                    skills.append(skill)

        experiences: List[Dict[str, Any]] = []
        cur_exp: Optional[Dict[str, Any]] = None
        pending_period = ""
        pending_location = ""

        for ln in sections["experience"]:
            is_bullet = ln.startswith(("- ", "* "))
            if is_bullet:
                if cur_exp is None:
                    cur_exp = {
                        "role": pending_location or "Experience",
                        "company": "",
                        "period": pending_period,
                        "location": pending_location if pending_period else "",
                        "bullets": [],
                    }
                    pending_period = ""
                    pending_location = ""
                cur_exp["bullets"].append(ln[2:].strip())
                continue

            date_m = DATE_RANGE_RE.search(ln)
            if date_m:
                period_val = date_m.group(1).strip()
                rest = DATE_RANGE_RE.sub("", ln.lstrip("#").strip()).strip(" -|•—()")
                if not rest or cls._looks_like_location(rest):
                    if cur_exp and (cur_exp["role"] or cur_exp["bullets"]):
                        if not cur_exp["period"] and not cur_exp["bullets"]:
                            cur_exp["period"] = period_val
                            if rest and not cur_exp["location"]:
                                cur_exp["location"] = rest
                            continue
                        experiences.append(cur_exp)
                        cur_exp = None
                    pending_period = period_val
                    pending_location = rest
                    continue

            # Append wrapped PDF line to previous bullet if we are already inside bullets
            if (
                cur_exp is not None
                and len(cur_exp["bullets"]) > 0
                and not ln.startswith("#")
                and not date_m
                and not any(sep in ln for sep in (" — ", " @ ", " | "))
                and not (len(ln) < 60 and " - " in ln)
            ):
                cur_exp["bullets"][-1] = f"{cur_exp['bullets'][-1]} {ln}".strip()
                continue

            if ln.startswith("## ") or ln.startswith("### ") or date_m or (len(ln) < 110 and any(sep in ln for sep in (" — ", " | ", " @ ", " - "))) or pending_period:
                if cur_exp and not cur_exp["company"] and not cur_exp["bullets"] and not date_m and not any(sep in ln for sep in (" — ", " | ", " @ ", " - ")):
                    cur_exp["company"] = ln.lstrip("#").strip()[:90]
                    continue

                if cur_exp and (cur_exp["role"] or cur_exp["bullets"]):
                    experiences.append(cur_exp)

                heading = ln.lstrip("#").strip()
                period = date_m.group(1).strip() if date_m else pending_period
                loc_val = pending_location
                pending_period = ""
                pending_location = ""

                if date_m:
                    heading = DATE_RANGE_RE.sub("", heading).strip(" -|•—()")
                role = heading
                company = ""
                for sep in (" — ", " @ ", " | ", " - "):
                    if sep in heading:
                        parts = [p.strip() for p in heading.split(sep, 1)]
                        role, company = parts[0], parts[1]
                        break
                cur_exp = {
                    "role": role or "Role",
                    "company": company,
                    "period": period,
                    "location": loc_val,
                    "bullets": [],
                }
            elif cur_exp is not None:
                if not cur_exp["company"] and not cur_exp["bullets"]:
                    cur_exp["company"] = ln[:90]
                elif not cur_exp["location"] and cls._looks_like_location(ln):
                    cur_exp["location"] = ln.strip()
                else:
                    cur_exp["bullets"].append(ln)

        if cur_exp and (cur_exp["role"] or cur_exp["bullets"]):
            experiences.append(cur_exp)

        educations: List[Dict[str, Any]] = []
        pending_edu_period = ""
        for ln in sections["education"]:
            clean = ln.lstrip("#- ").strip()
            if not clean:
                continue
            dm = DATE_RANGE_RE.search(clean)
            period = dm.group(1).strip() if dm else ""
            txt = DATE_RANGE_RE.sub("", clean).strip(" -|•—()")
            if dm and (not txt or cls._looks_like_location(txt)):
                pending_edu_period = period
                continue

            resolved_period = period or pending_edu_period
            pending_edu_period = ""

            if any(sep in txt for sep in (" — ", " | ", " - ", ", ")):
                for sep in (" — ", " | ", " - ", ", "):
                    if sep in txt:
                        deg, inst = [p.strip() for p in txt.split(sep, 1)]
                        educations.append({"degree": deg, "institution": inst, "period": resolved_period})
                        break
            elif educations and not educations[-1]["institution"]:
                educations[-1]["institution"] = txt
                if resolved_period and not educations[-1]["period"]:
                    educations[-1]["period"] = resolved_period
            else:
                educations.append({"degree": txt, "institution": "", "period": resolved_period})

        projects: List[Dict[str, Any]] = []
        for ln in sections["projects"]:
            clean = ln.lstrip("#- ").strip()
            if clean:
                if ":" in clean:
                    title, desc = [p.strip() for p in clean.split(":", 1)]
                    projects.append({"title": title[:80], "tech": "", "description": desc})
                else:
                    projects.append({"title": clean[:80], "tech": "", "description": ""})

        certifications: List[Dict[str, Any]] = []
        for ln in sections["certifications"]:
            clean = ln.lstrip("#- ").strip()
            if clean:
                if " - " in clean or " — " in clean:
                    sep = " — " if " — " in clean else " - "
                    name, issuer = [p.strip() for p in clean.split(sep, 1)]
                    certifications.append({"name": name, "issuer": issuer})
                else:
                    certifications.append({"name": clean, "issuer": ""})

        languages: List[Dict[str, Any]] = []
        for ln in sections["languages"]:
            clean = ln.lstrip("#- ").strip()
            if not clean:
                continue
            for item in re.split(r"[,;|]", clean):
                part = item.strip()
                if not part:
                    continue
                if ":" in part:
                    name, level = [p.strip() for p in part.split(":", 1)]
                    languages.append({"name": name, "level": level})
                elif "(" in part and ")" in part:
                    name = part.split("(", 1)[0].strip()
                    level = part.split("(", 1)[1].rstrip(")").strip()
                    languages.append({"name": name, "level": level})
                else:
                    languages.append({"name": part, "level": ""})

        verified_facts: List[str] = []
        for exp in experiences:
            for b in exp.get("bullets", []):
                if re.search(r"\d+%|\$\d+|\d+x|\d+\+", b) and b not in verified_facts:
                    verified_facts.append(b)
                    if len(verified_facts) >= 8:
                        break

        return {
            "full_name": full_name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "portfolio_url": portfolio_url,
            "summary": summary,
            "skills": skills[:60],
            "experiences": experiences,
            "educations": educations,
            "certifications": certifications,
            "projects": projects,
            "languages": languages,
            "verified_facts": verified_facts,
        }

    @classmethod
    async def parse_cv_upload(
        cls,
        filename: str,
        content: bytes,
        user_doc: Dict[str, Any],
        user_keys: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Convert uploaded CV to Markdown and extract structured profile fields."""
        raw_text, ext = cls.extract_text_from_bytes(filename, content)
        fallback_md = cls._normalize_to_markdown(raw_text, ext)
        fallback_profile = cls._heuristic_extract(fallback_md, user_doc)

        resolved_keys = AITailorService._resolve_provider_keys(user_keys)
        has_llm = any(bool(v) for v in resolved_keys.values())
        if not has_llm:
            return {
                "filename": os.path.basename(filename or "cv"),
                "cv_markdown": fallback_md,
                "profile": fallback_profile,
                "used_ai": False,
            }

        prompt = f"""Convert the following resume/CV text into clean structured Markdown and extract ONLY factual profile fields present in the text. Do NOT invent or assume any information that is not explicitly written in the CV.

Return valid JSON with this exact schema:
{{
  "cv_markdown": "Clean Markdown version of the full CV using #, ##, and - bullets",
  "profile": {{
    "full_name": "string",
    "headline": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin_url": "string or null",
    "github_url": "string or null",
    "portfolio_url": "string or null",
    "summary": "string",
    "skills": ["string"],
    "experiences": [{{"role": "string", "company": "string", "period": "string", "location": "string", "bullets": ["string"]}}],
    "educations": [{{"degree": "string", "institution": "string", "period": "string"}}],
    "certifications": [{{"name": "string", "issuer": "string"}}],
    "projects": [{{"title": "string", "tech": "string", "description": "string"}}],
    "languages": [{{"name": "string", "level": "string"}}],
    "verified_facts": ["string"]
  }}
}}

CV TEXT:
{raw_text[:18000]}
"""
        try:
            raw_ai = await AITailorService.call_llm(
                prompt=prompt,
                system_prompt="You are a strict zero-hallucination resume parser. Output valid JSON only.",
                user_keys=user_keys,
            )
            parsed = json.loads(_strip_json_fences(raw_ai))
            ai_md = (parsed.get("cv_markdown") or "").strip() or fallback_md
            ai_prof = parsed.get("profile") or {}
            merged_profile = {**fallback_profile, **{k: v for k, v in ai_prof.items() if v not in (None, "", [])}}
            return {
                "filename": os.path.basename(filename or "cv"),
                "cv_markdown": ai_md,
                "profile": merged_profile,
                "used_ai": True,
            }
        except Exception as exc:
            logger.warning(f"Fallback para parser heurístico após erro LLM no parse de CV: {exc}")
            return {
                "filename": os.path.basename(filename or "cv"),
                "cv_markdown": fallback_md,
                "profile": fallback_profile,
                "used_ai": False,
            }
