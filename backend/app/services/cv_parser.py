import io
import json
import logging
import os
import re
import statistics
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber
from docx import Document
from fastapi import HTTPException
from markdownify import markdownify as html_to_markdown
from pypdf import PdfReader

from backend.app.services.ai_tailor import AITailorService, _strip_json_fences

logger = logging.getLogger(__name__)

MAX_CV_FILE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".markdown", ".txt", ".html", ".htm"}

SECTION_ALIASES: Dict[str, Tuple[str, ...]] = {
    "personal_info": (
        "informações pessoais", "informacoes pessoais", "dados pessoais", "contactos", "contacto",
        "personal information", "personal details", "contact", "contacts",
        "datos personales", "persönliche daten", "kontakt",
    ),
    "summary": (
        "summary", "professional summary", "profile", "professional profile", "about", "about me",
        "objective", "career objective",
        "resumo", "resumo profissional", "sobre", "sobre mim", "perfil", "perfil profissional", "objetivo",
        "resumen", "perfil profesional", "presentación",
        "zusammenfassung", "profil", "kurzprofil", "über mich",
    ),
    "experience": (
        "experience", "work experience", "professional experience", "employment", "employment history",
        "career history", "work history",
        "experiência", "experiencia", "experiência profissional", "experiencia profissional",
        "experiência de trabalho", "percurso profissional", "histórico profissional",
        "experiencia laboral", "experiencia profesional",
        "berufserfahrung", "erfahrung",
    ),
    "education": (
        "education", "education and training", "academic background", "qualifications",
        "educação", "educacao", "educação e formação", "educacao e formacao",
        "formação", "formacao", "formação académica", "formacao academica",
        "habilitações", "habilitacoes", "habilitações e formação", "habilitacoes e formacao",
        "habilitações académicas", "habilitacoes academicas", "habilitações literárias", "habilitacoes literarias",
        "educación", "educación y formación", "formación", "formación académica",
        "ausbildung", "studium", "schulbildung", "schul- und berufsbildung",
    ),
    "skills": (
        "skills", "technical skills", "digital skills", "core competencies", "technologies", "tech stack", "hard skills",
        "competências", "competencias", "competências técnicas", "competencias tecnicas",
        "competências digitais", "competencias digitais", "competências profissionais", "competencias profissionais",
        "competências pessoais", "competencias pessoais", "competências de comunicação", "competencias de comunicacao",
        "competências de organização", "competências organizacionais",
        "habilidades", "fähigkeiten", "kenntnisse", "kompetenzen",
    ),
    "projects": (
        "projects", "featured projects", "key projects",
        "projetos", "projectos", "projetos relevantes",
        "proyectos", "projekte",
    ),
    "certifications": (
        "certifications", "licenses", "licenses & certifications", "certificates",
        "certificações", "certificacoes", "certificados", "cursos e certificações", "formação complementar",
        "certificaciones", "zertifikate",
    ),
    "languages": (
        "languages", "language skills",
        "competências linguísticas", "competencias linguisticas",
        "idiomas", "línguas", "linguas", "sprachen",
    ),
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?")
URL_RE = re.compile(
    r"https?://[^\s<>()\"']+|(?:www\.)?[a-z0-9.-]+\.(?:com|io|dev|org|net|pt|de|es|ai|eu)/[^\s<>()\"']*",
    re.IGNORECASE,
)

MONTH_TOKEN = (
    r"(?:jan(?:uary|eiro|ero)?|feb(?:ruary)?|fev(?:ereiro)?|mar(?:ch|ço|co)?|mär(?:z)?|"
    r"apr(?:il)?|abr(?:il)?|may|mai(?:o)?|jun(?:e|ho|io)?|jul(?:y|ho|io)?|"
    r"aug(?:ust)?|ago(?:sto)?|sep(?:tember)?|set(?:embro)?|oct(?:ober)?|out(?:ubro)?|okt(?:ober)?|"
    r"nov(?:ember|embro)?|dec(?:ember)?|dez(?:embro)?)"
)
PRESENT_TOKEN = (
    r"(?:present(?:e)?|atual(?:mente)?|actual(?:mente)?|current(?:ly)?|ongoing|heute|now|"
    r"em\s+curso|a\s+decorrer|at[eé]\s+o\s+momento|at[eé]\s+[àa]\s+data)"
)
START_DATE_PART = (
    rf"(?:\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{4}}|\d{{1,2}}[/-]\d{{4}}|"
    rf"{MONTH_TOKEN}\.?\s*(?:de\s+)?\d{{4}}|\d{{4}})"
)
END_DATE_PART = (
    rf"(?:\d{{1,2}}[/-]\d{{1,2}}[/-]\d{{4}}|\d{{1,2}}[/-]\d{{4}}|"
    rf"{MONTH_TOKEN}\.?\s*(?:de\s+)?\d{{4}}|\d{{4}}|{PRESENT_TOKEN})"
)
DATE_RANGE_RE = re.compile(
    rf"({START_DATE_PART}\s*(?:[-–—]|to|até|ate|bis|\ba\b)\s*{END_DATE_PART})",
    re.IGNORECASE,
)

BULLET_CHARS = "•●▪◦‣∙➤➢➣▸▹▫◆◇▪*"
PUA_BULLETS = {"\uf0b7", "\uf0a7", "\uf0d8", "\uf0a8", "\uf075", "\uf076", "\uf0fc", "\uf0fe", "\uf06e"}
LIGATURE_MAP = str.maketrans({
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
    "\u00a0": " ",
    "\u202f": " ",
    "\u2009": " ",
    "\u200b": "",
    "\u200c": "",
    "\u200d": "",
    "\u200e": "",
    "\u200f": "",
    "\ufeff": "",
    "\u00ad": "",
})

BOILERPLATE_HEADER_RE = re.compile(
    r"^(?:curriculum\s+vitae(?:\s+europass)?|europass|resume|cv|p[aá]g(?:ina)?\.?\s*\d+(?:\s*(?:/|de|of)\s*\d+)?|"
    r"page\s+\d+\s*(?:/|of)\s*\d+|\d+\s*/\s*\d+|©\s*(?:european union|uni[aã]o europeia).*)$",
    re.IGNORECASE,
)

PERSONAL_LABEL_RE = re.compile(
    r"^(?:data de nascimento|date of birth|nacionalidade|nationality|sexo|gender|"
    r"telem[oó]vel|telefone|phone|mobile|e-?mail|endere[cç]o de correio eletr[oó]nico|"
    r"morada|address|localidade|cidade|city|pa[ií]s|country|website|site|linkedin|github|portfolio)\s*:",
    re.IGNORECASE,
)

ENTRY_META_PREFIX_RE = re.compile(
    r"^(?:cidade|localidade|pa[ií]s|city|country|website|site|endere[cç]o|address|"
    r"empresa ou setor|atividade ou setor|setor de atividade|sector|"
    r"principais atividades e responsabilidades|main activities and responsibilities|"
    r"[aá]rea(?:\(s\))? de estudo|dom[ií]nio(?:\(s\))? de estudo|field(?:\(s\))? of study|"
    r"classifica[cç][aã]o(?:\s+final)?|final grade|nota|gpa|"
    r"n[ií]vel\s+no\s+qeq|eqf\s+level|level in eqf|n[ií]vel\s+qeq)\s*:",
    re.IGNORECASE,
)

CEFR_NOISE_TOKENS = {
    "autoavaliação", "autoavaliacao", "self-assessment", "nivelamento",
    "compreensão oral", "compreensao oral", "compreensão escrita", "compreensao escrita",
    "leitura", "interação oral", "interacao oral", "produção oral", "producao oral", "escrita",
    "listening", "reading", "spoken interaction", "spoken production", "writing",
    "utilizador básico", "utilizador basico", "utilizador independente", "utilizador avançado", "utilizador avancado",
    "basic user", "independent user", "proficient user",
    "tratamento da informação", "comunicação", "criação de conteúdos", "segurança", "resolução de problemas",
}

INSTITUTION_HINTS = (
    "universidade", "university", "instituto", "institute", "escola", "school",
    "faculdade", "faculty", "college", "academy", "academia", "politécnico", "politecnico",
    "hochschule", "centro de formação", "iefp",
)


def _clean_pdf_text(text: str) -> str:
    """Normalize ligatures, PUA bullet/icon glyphs, and invisible PDF whitespace characters."""
    if not text:
        return ""
    out_chars: List[str] = []
    for idx, ch in enumerate(text):
        if ch in PUA_BULLETS:
            out_chars.append("• " if idx == 0 else " ")
        elif 0xE000 <= ord(ch) <= 0xF8FF:
            # Strip font icon glyphs (phone/envelope/map pins from Canva/Europass/FontAwesome)
            continue
        else:
            out_chars.append(ch)
    cleaned = "".join(out_chars).translate(LIGATURE_MAP)
    cleaned = re.sub(rf"^([{re.escape(BULLET_CHARS)}])(\S)", r"\1 \2", cleaned)
    return re.sub(r"[ \t]+", " ", cleaned).strip()


def _collapse_spaced_letters(line: str) -> str:
    """Fix spaced-out PDF headings like 'E X P E R I Ê N C I A' back into 'EXPERIÊNCIA'."""
    def _join_run(match: re.Match) -> str:
        return match.group(0).replace(" ", "")

    # Match sequences of >= 4 single letters separated by single spaces (bounded by spaces/ends)
    return re.sub(r"(?:(?<=^)|(?<=\s))(?:[A-Za-zÀ-ÿ]\s){3,}[A-Za-zÀ-ÿ](?=\s|$)", _join_run, line)


def _dehyphenate_lines(lines: List[str]) -> List[str]:
    """Rejoin words split across PDF lines with a trailing hyphen."""
    result: List[str] = []
    for ln in lines:
        if (
            result
            and re.search(r"[A-Za-zÀ-ÿ]-$", result[-1])
            and not result[-1].endswith(" -")
            and ln
            and re.match(r"^[a-zà-ÿ]", ln)
        ):
            result[-1] = f"{result[-1][:-1]}{ln}"
        else:
            result.append(ln)
    return result


class CVParserService:
    """Extracts text from uploaded CV files, converts to Markdown, and parses structured profile fields."""

    @staticmethod
    def _group_words_into_lines(words: List[Dict[str, Any]], gap_join_token: str = " | ") -> List[Dict[str, Any]]:
        """Cluster spatially close words into ordered visual lines with font metadata."""
        if not words:
            return []
        sorted_words = sorted(words, key=lambda w: (w["top"], w["x0"]))
        rows: List[List[Dict[str, Any]]] = []
        for w in sorted_words:
            if not rows:
                rows.append([w])
                continue
            ref_top = statistics.median(item["top"] for item in rows[-1])
            ref_size = statistics.median(item.get("size") or 10.0 for item in rows[-1])
            tol = max(3.0, min(6.0, ref_size * 0.45))
            if abs(w["top"] - ref_top) <= tol:
                rows[-1].append(w)
            else:
                rows.append([w])

        lines: List[Dict[str, Any]] = []
        for row in rows:
            row.sort(key=lambda w: w["x0"])
            parts: List[str] = []
            prev_word: Optional[Dict[str, Any]] = None
            sizes: List[float] = []
            bold_chars = 0
            total_chars = 0

            first_clean = _clean_pdf_text(row[0].get("text", ""))
            is_bullet_row = bool(first_clean and (first_clean[0] in BULLET_CHARS or first_clean.startswith("- ")))
            wide_gap_count = sum(
                1 for idx in range(1, len(row))
                if (row[idx]["x0"] - row[idx - 1]["x1"]) > max(26.0, float(row[idx].get("size") or 10.0) * 2.6)
            )
            allow_column_join = (not is_bullet_row) and wide_gap_count == 1 and len(row) <= 12

            for w in row:
                txt = _clean_pdf_text(w.get("text", ""))
                if not txt:
                    continue
                if prev_word is not None:
                    gap = w["x0"] - prev_word["x1"]
                    prev_txt = parts[-1].strip() if parts else ""
                    w_size = float(w.get("size") or 10.0)
                    is_prev_bullet = len(prev_txt) <= 2 and any(ch in BULLET_CHARS + "-" for ch in prev_txt)
                    if allow_column_join and not is_prev_bullet and gap > max(26.0, w_size * 2.6):
                        parts.append(gap_join_token)
                    elif gap > max(4.5, w_size * 0.55):
                        parts.append("  ")
                    elif gap > max(1.0, w_size * 0.12):
                        parts.append(" ")
                parts.append(txt)
                prev_word = w

                fname = str(w.get("fontname") or "").lower()
                is_w_bold = any(k in fname for k in ("bold", "heavy", "black", "semibold", "demi", "medi"))
                total_chars += len(txt)
                if is_w_bold:
                    bold_chars += len(txt)
                if w.get("size"):
                    sizes.append(float(w["size"]))

            line_text = _collapse_spaced_letters("".join(parts).strip())
            line_text = re.sub(r"[ \t]+", " ", line_text).strip()
            line_text = re.sub(r"\s*\|\s*\|+\s*", " | ", line_text).strip(" |")
            line_text = re.sub(rf"^([{re.escape(BULLET_CHARS)}])(\S)", r"\1 \2", line_text)
            if line_text:
                lines.append({
                    "text": line_text,
                    "top": min(w["top"] for w in row),
                    "bottom": max(w["bottom"] for w in row),
                    "x0": min(w["x0"] for w in row),
                    "x1": max(w["x1"] for w in row),
                    "size": statistics.median(sizes) if sizes else 10.0,
                    "is_bold": (bold_chars / max(total_chars, 1)) >= 0.6,
                })
        return lines

    @classmethod
    def _find_two_column_split(cls, words: List[Dict[str, Any]], page_width: float, page_height: float = 842.0) -> Optional[float]:
        """Detect a true two-column vertical gutter if the page splits cleanly into sidebar + main body."""
        if len(words) < 25 or page_width <= 0:
            return None

        best_x: Optional[float] = None
        best_score = -1.0
        min_x = page_width * 0.24
        max_x = page_width * 0.62
        step = max(4.0, page_width * 0.01)

        # Ignore top 15% header band and bottom 8% footer band when testing column separation
        body_words = [w for w in words if w["top"] >= page_height * 0.14 and w["bottom"] <= page_height * 0.92]
        if len(body_words) < 20:
            body_words = words

        x = min_x
        while x <= max_x:
            crossing = [w for w in body_words if w["x0"] < x - 2 and w["x1"] > x + 2]
            left = [w for w in body_words if w["x1"] <= x]
            right = [w for w in body_words if w["x0"] >= x]
            if len(left) >= 10 and len(right) >= 20 and len(crossing) <= 2:
                left_min_y = min(w["top"] for w in left)
                left_max_y = max(w["bottom"] for w in left)
                right_min_y = min(w["top"] for w in right)
                right_max_y = max(w["bottom"] for w in right)
                y_overlap = min(left_max_y, right_max_y) - max(left_min_y, right_min_y)

                left_ys = {round(w["top"] / 10.0) for w in left}
                right_ys = {round(w["top"] / 10.0) for w in right}
                if y_overlap >= 60.0 and len(left_ys) >= 4 and len(right_ys) >= 5:
                    gap_margin = min((w["x0"] for w in right)) - max((w["x1"] for w in left))
                    score = len(left_ys) + len(right_ys) + gap_margin - len(crossing) * 20.0
                    if score > best_score:
                        best_score = score
                        best_x = x
            x += step
        return best_x

    @classmethod
    def _extract_pdf_with_pdfplumber(cls, content: bytes) -> Tuple[str, List[Dict[str, Any]]]:
        """Extract column-aware, font-aware text lines from a PDF using pdfplumber."""
        all_pages_lines: List[List[Dict[str, Any]]] = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                words = page.extract_words(
                    x_tolerance=2.0,
                    y_tolerance=3.0,
                    keep_blank_chars=False,
                    use_text_flow=False,
                    extra_attrs=["fontname", "size"],
                )
                if not words:
                    continue

                split_x = cls._find_two_column_split(words, page.width, page.height)
                page_lines: List[Dict[str, Any]] = []

                if split_x is not None:
                    body_start_y = max(
                        (w["bottom"] for w in words if w["top"] < page.height * 0.14 and (w["x0"] < split_x - 2 or not any(rw["x0"] >= split_x and abs(rw["top"] - w["top"]) < 10 for rw in words))),
                        default=0.0,
                    )
                    banner_words = [w for w in words if w["top"] <= body_start_y] if body_start_y > 0 else []
                    body_words = [w for w in words if w["top"] > body_start_y]

                    left_words = [w for w in body_words if (w["x0"] + w["x1"]) / 2.0 < split_x]
                    right_words = [w for w in body_words if (w["x0"] + w["x1"]) / 2.0 >= split_x]

                    left_lines = cls._group_words_into_lines(left_words, gap_join_token=" ")
                    right_lines = cls._group_words_into_lines(right_words, gap_join_token=" ")

                    left_sections = sum(1 for item in left_lines if cls._match_section(item["text"]) is not None)
                    right_sections = sum(1 for item in right_lines if cls._match_section(item["text"]) is not None)
                    left_label_or_date = sum(
                        1 for item in left_lines
                        if (
                            cls._match_section(item["text"]) is not None
                            or DATE_RANGE_RE.search(item["text"])
                            or cls._looks_like_location(item["text"])
                            or PERSONAL_LABEL_RE.match(item["text"])
                            or ENTRY_META_PREFIX_RE.match(item["text"])
                        )
                    )
                    is_timeline_table = (
                        (left_sections > 0 and right_sections == 0)
                        or (left_label_or_date / max(len(left_lines), 1) >= 0.55)
                    )

                    if is_timeline_table:
                        page_lines = cls._group_words_into_lines(words, gap_join_token=" | ")
                    else:
                        if banner_words:
                            page_lines.extend(cls._group_words_into_lines(banner_words, gap_join_token=" | "))
                        page_lines.extend(left_lines)
                        page_lines.append({"text": "", "is_bold": False, "size": 10.0, "top": 0.0, "bottom": 0.0})
                        page_lines.extend(right_lines)
                else:
                    page_lines = cls._group_words_into_lines(words, gap_join_token=" | ")

                for item in page_lines:
                    item["page"] = page_idx
                    item["page_height"] = page.height
                all_pages_lines.append(page_lines)

        if not all_pages_lines:
            return "", []

        # Strip repeated headers/footers across 2+ pages
        repeated_edge_texts: set[str] = set()
        if len(all_pages_lines) >= 2:
            edge_counts: Counter = Counter()
            for p_lines in all_pages_lines:
                seen_on_page: set[str] = set()
                for item in p_lines:
                    txt = item["text"].strip()
                    ph = item.get("page_height") or 842.0
                    if txt and (item["top"] < ph * 0.09 or item["bottom"] > ph * 0.91):
                        seen_on_page.add(txt.lower())
                for s in seen_on_page:
                    edge_counts[s] += 1
            repeated_edge_texts = {txt for txt, count in edge_counts.items() if count >= 2}

        filtered_items: List[Dict[str, Any]] = []
        for p_idx, p_lines in enumerate(all_pages_lines):
            if p_idx > 0 and filtered_items and filtered_items[-1]["text"] != "":
                filtered_items.append({"text": "", "is_bold": False, "size": 10.0})
            for item in p_lines:
                txt = item["text"]
                if not txt:
                    if filtered_items and filtered_items[-1]["text"] != "":
                        filtered_items.append(item)
                    continue
                low = txt.lower()
                if low in repeated_edge_texts or BOILERPLATE_HEADER_RE.match(txt):
                    continue
                filtered_items.append(item)

        # Rejoin hyphenated PDF word wraps while preserving metadata
        merged_items: List[Dict[str, Any]] = []
        for item in filtered_items:
            txt = item["text"]
            if (
                merged_items
                and re.search(r"[A-Za-zÀ-ÿ]-$", merged_items[-1]["text"])
                and not merged_items[-1]["text"].endswith(" -")
                and txt
                and re.match(r"^[a-zà-ÿ]", txt)
            ):
                merged_items[-1]["text"] = f"{merged_items[-1]['text'][:-1]}{txt}"
            else:
                merged_items.append(item)

        raw_text = "\n".join(item["text"] for item in merged_items).strip()
        return raw_text, merged_items

    @classmethod
    def _extract_pdf_text(cls, content: bytes) -> Tuple[str, List[Dict[str, Any]]]:
        """Extract clean PDF text prioritizing spatial pdfplumber extraction with pypdf fallback."""
        try:
            text, line_meta = cls._extract_pdf_with_pdfplumber(content)
            if text and len(text.strip()) >= 20:
                return text, line_meta
        except Exception as exc:
            logger.warning(f"Falha na extração espacial com pdfplumber, usando fallback pypdf: {exc}")

        reader = PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            raw = _clean_pdf_text(page.extract_text() or "")
            if not raw:
                continue
            cleaned_lines = [
                _collapse_spaced_letters(_clean_pdf_text(ln))
                for ln in raw.splitlines()
                if ln.strip() and not BOILERPLATE_HEADER_RE.match(ln.strip())
            ]
            pages.append("\n".join(_dehyphenate_lines(cleaned_lines)))
        return "\n\n".join(p for p in pages if p).strip(), []

    @classmethod
    def extract_text_from_bytes(cls, filename: str, content: bytes) -> Tuple[str, str]:
        """Extract text (and optional pre-markdown) from PDF, DOCX, MD, TXT, or HTML."""
        text, ext, _ = cls._extract_with_metadata(filename, content)
        return text, ext

    @classmethod
    def _extract_with_metadata(cls, filename: str, content: bytes) -> Tuple[str, str, List[Dict[str, Any]]]:
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
            raw = content.decode("utf-8", errors="replace").translate(LIGATURE_MAP).strip()
            lines = _dehyphenate_lines([_clean_pdf_text(ln) if ln.strip() else "" for ln in raw.splitlines()])
            text = "\n".join(lines).strip()
            if not text:
                raise HTTPException(status_code=400, detail="Não foi possível ler texto do ficheiro enviado.")
            return text, ext, []

        if ext in {".html", ".htm"}:
            html_str = content.decode("utf-8", errors="replace").translate(LIGATURE_MAP)
            md = html_to_markdown(html_str, heading_style="ATX").strip()
            if not md:
                raise HTTPException(status_code=400, detail="O ficheiro HTML não contém conteúdo legível.")
            return md, ext, []

        if ext == ".pdf":
            try:
                text, line_meta = cls._extract_pdf_text(content)
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Erro ao ler PDF: {exc}")
            if not text:
                raise HTTPException(
                    status_code=400,
                    detail="Não foi possível extrair texto do PDF (verifique se não é apenas uma imagem digitalizada).",
                )
            return text, ext, line_meta

        # .docx
        try:
            doc = Document(io.BytesIO(content))
            lines: List[str] = []
            for para in doc.paragraphs:
                txt = _clean_pdf_text(para.text or "")
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
                    cells = [_clean_pdf_text(c.text.replace("\n", " ")) for c in row.cells if c.text.strip()]
                    if cells:
                        lines.append(" | ".join(cells))
            text = "\n".join(lines).strip()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Erro ao ler documento DOCX: {exc}")

        if not text:
            raise HTTPException(status_code=400, detail="O documento DOCX está vazio.")
        return text, ext, []

    @staticmethod
    def _match_section(line: str) -> Optional[str]:
        clean = re.sub(r"^(?:[#*\-\s•·●▪◦]+|\d+[.)]\s*|[IVXLCDM]+\.\s*)|[:\s]+$", "", line)
        clean = re.sub(r"\s+", " ", clean).strip().lower()
        if not clean or len(clean) > 60:
            return None
        for sec, aliases in SECTION_ALIASES.items():
            if clean in aliases:
                return sec
        return None

    @staticmethod
    def _looks_like_location(text: str) -> bool:
        clean = text.strip(" -|•—–()")
        if not clean or len(clean) > 65:
            return False
        low = clean.lower()
        non_location_tokens = (
            "engineer", "developer", "diretor", "director", "manager", "lead", "intern",
            "estágio", "estagio", "coordenador", "analista", "técnico", "tecnico",
            "bsc", "msc", "licenciatura", "mestrado", "curso", "universidade",
            "university", "instituto", "institute", "escola", "school", "associação", "associacao",
            "designer", "editor", "consultor", "consultant", "specialist", "especialista",
        )
        if any(tok in low for tok in non_location_tokens):
            return False
        if re.search(r"\d{4}|@|https?://", low):
            return False
        if low in {
            "remote", "remoto", "portugal", "spain", "espanha", "germany", "alemanha",
            "france", "frança", "uk", "usa", "lisboa", "porto", "coimbra", "braga", "covilhã", "covilha",
        }:
            return True
        return "," in clean and len(clean.split(",")) <= 3 and len(clean.split()) <= 6

    @staticmethod
    def _looks_like_institution(text: str) -> bool:
        low = text.lower()
        return any(tok in low for tok in INSTITUTION_HINTS)

    @staticmethod
    def _should_merge_continuation(prev_line: str, next_line: str, next_meta: Optional[Dict[str, Any]], median_size: float) -> bool:
        """Return True when next_line is a soft PDF line-wrap continuation of prev_line."""
        if not prev_line or not next_line:
            return False
        if prev_line.startswith("#") or next_line.startswith("#"):
            return False
        if next_line[0] in BULLET_CHARS or next_line.startswith(("- ", "* ")):
            return False
        if DATE_RANGE_RE.search(next_line) or ENTRY_META_PREFIX_RE.match(next_line) or PERSONAL_LABEL_RE.match(next_line):
            return False
        if CVParserService._match_section(next_line):
            return False
        if next_meta and (next_meta.get("size", 10.0) >= median_size * 1.12 or (next_meta.get("is_bold") and len(next_line) < 70)):
            return False
        if any(sep in next_line for sep in (" — ", " @ ", " | ")) and not prev_line.startswith("- "):
            return False

        is_prev_bullet = prev_line.startswith("- ")
        starts_lowercase_or_punct = bool(re.match(r"^[a-zà-ÿ,;.)\]%]", next_line))
        incomplete_tail = (
            not prev_line.endswith((".", "!", "?", ":", ";"))
            or bool(re.search(r"\b(?:de|da|do|das|dos|e|em|na|no|para|com|por|um|uma|a|o|of|and|the|for|with|in|to),?$", prev_line.lower()))
        )
        if is_prev_bullet:
            return starts_lowercase_or_punct or (incomplete_tail and len(prev_line) > 35)
        return starts_lowercase_or_punct

    @classmethod
    def _normalize_to_markdown(
        cls,
        raw_text: str,
        ext: str,
        line_meta: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Convert plain or semi-structured CV text into clean structured Markdown."""
        if ext in {".md", ".markdown", ".html", ".htm"}:
            return re.sub(r"\n{3,}", "\n\n", raw_text).strip()

        expanded_lines: List[str] = []
        expanded_meta: List[Optional[Dict[str, Any]]] = []
        raw_split_lines = [ln.rstrip() for ln in raw_text.splitlines()]
        raw_split_meta = line_meta if (line_meta and len(line_meta) == len(raw_split_lines)) else [None] * len(raw_split_lines)
        for idx, ln in enumerate(raw_split_lines):
            if " | " in ln:
                head, tail = [p.strip() for p in ln.split(" | ", 1)]
                if cls._match_section(head) and tail:
                    expanded_lines.extend([head, tail])
                    expanded_meta.extend([raw_split_meta[idx], raw_split_meta[idx]])
                    continue
            expanded_lines.append(ln)
            expanded_meta.append(raw_split_meta[idx])

        raw_lines = expanded_lines
        meta_by_index: List[Optional[Dict[str, Any]]] = expanded_meta

        sizes = [m["size"] for m in meta_by_index if m and m.get("text")]
        median_size = statistics.median(sizes) if sizes else 10.0

        # Pick best candidate line index for top # Name heading
        name_idx: Optional[int] = None
        best_score = -1.0
        for idx, ln in enumerate(raw_lines[:15]):
            stripped = ln.strip()
            if not stripped or BOILERPLATE_HEADER_RE.match(stripped) or cls._match_section(stripped):
                continue
            if "@" in stripped or "http" in stripped.lower() or PERSONAL_LABEL_RE.match(stripped):
                continue
            if len(stripped) > 70 or DATE_RANGE_RE.search(stripped):
                continue
            m = meta_by_index[idx]
            score = (m["size"] if m else median_size) + (2.0 if m and m.get("is_bold") else 0.0)
            if idx == 0:
                score += 1.0
            if score > best_score:
                best_score = score
                name_idx = idx

        out_lines: List[str] = []
        out_meta: List[Optional[Dict[str, Any]]] = []

        for idx, ln in enumerate(raw_lines):
            stripped = _clean_pdf_text(ln.strip())
            if not stripped:
                if out_lines and out_lines[-1] != "":
                    out_lines.append("")
                    out_meta.append(None)
                continue

            if BOILERPLATE_HEADER_RE.match(stripped):
                continue

            if idx == name_idx:
                out_lines.append(stripped if stripped.startswith("#") else f"# {stripped}")
                out_meta.append(meta_by_index[idx])
                continue

            matched_sec = cls._match_section(stripped)
            if matched_sec:
                heading_title = re.sub(r"^(?:[#*\-\s•·●▪◦]+|\d+[.)]\s*)|[:\s]+$", "", stripped).strip()
                out_lines.append(f"\n## {heading_title}")
                out_meta.append(meta_by_index[idx])
                continue

            if stripped[0] in BULLET_CHARS or stripped.startswith("- ") or stripped.startswith("– "):
                bullet_text = stripped[1:].strip() if not stripped.startswith(("- ", "* ", "– ")) else stripped[2:].strip()
                if bullet_text:
                    out_lines.append(f"- {bullet_text}")
                    out_meta.append(meta_by_index[idx])
                continue

            if out_lines and cls._should_merge_continuation(out_lines[-1], stripped, meta_by_index[idx], median_size):
                if re.search(r"[A-Za-zÀ-ÿ]-$", out_lines[-1]) and not out_lines[-1].endswith(" -") and re.match(r"^[a-zà-ÿ]", stripped):
                    out_lines[-1] = f"{out_lines[-1][:-1]}{stripped}"
                else:
                    out_lines[-1] = f"{out_lines[-1]} {stripped}"
                continue

            out_lines.append(stripped)
            out_meta.append(meta_by_index[idx])

        return re.sub(r"\n{3,}", "\n\n", "\n".join(out_lines)).strip()

    @classmethod
    def _extract_contact_fields(cls, lines: List[str], full_text: str, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Extract name, headline, email, phone, location, and URLs cleanly across languages."""
        email_match = EMAIL_RE.search(full_text)
        email = email_match.group(0) if email_match else user_doc.get("email", "")

        phone = ""
        for ln in lines[:20]:
            cleaned_ln = EMAIL_RE.sub("", DATE_RANGE_RE.sub("", ln))
            pm = PHONE_RE.search(cleaned_ln)
            if pm and 8 <= sum(c.isdigit() for c in pm.group(0)) <= 15:
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
            if "europass" in low_u or "europa.eu" in low_u:
                continue
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
        for ln in lines[:18]:
            sec = cls._match_section(ln)
            if sec and sec != "personal_info":
                break
            header_lines.append(ln)

        for hl in header_lines:
            plain = hl.lstrip("#").strip()
            if not plain or BOILERPLATE_HEADER_RE.match(plain) or cls._match_section(plain):
                continue

            if hl.startswith("# ") and len(plain) <= 70 and "@" not in plain and not PERSONAL_LABEL_RE.match(plain):
                full_name = plain
                continue

            if PERSONAL_LABEL_RE.match(plain):
                label, _, val = plain.partition(":")
                low_lbl = label.strip().lower()
                val_clean = val.strip()
                if any(k in low_lbl for k in ("localidade", "cidade", "city", "morada", "address", "location")) and not location and val_clean:
                    location = val_clean.split("|")[0].strip()[:80]
                continue

            if not location and cls._looks_like_location(plain):
                location = plain.split("|")[0].strip()[:80]
                continue

            if not location and ("|" in plain or "•" in plain):
                for seg in re.split(r"\s*[|•·]\s*", plain):
                    if cls._looks_like_location(seg):
                        location = seg.strip()[:80]
                        break

            if (
                not full_name
                and len(plain) <= 70
                and "@" not in plain
                and "http" not in plain.lower()
                and not PHONE_RE.fullmatch(plain)
            ):
                full_name = plain
                continue

            if (
                not headline
                and plain != full_name
                and "@" not in plain
                and "http" not in plain.lower()
                and not PHONE_RE.fullmatch(plain)
                and not DATE_RANGE_RE.search(plain)
                and not cls._looks_like_location(plain)
                and len(plain) <= 120
            ):
                headline = plain

        return {
            "full_name": full_name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "portfolio_url": portfolio_url,
        }

    @classmethod
    def _parse_experiences(cls, exp_lines: List[str]) -> List[Dict[str, Any]]:
        """Parse experience blocks in Europass (date+location first), role-first, or pipe-separated styles."""
        experiences: List[Dict[str, Any]] = []
        cur_exp: Optional[Dict[str, Any]] = None
        pending_period = ""
        pending_location = ""

        def _flush():
            nonlocal cur_exp
            if cur_exp and (cur_exp.get("role") or cur_exp.get("bullets")):
                if cur_exp["role"] in {"Experience", "Role", ""} and cur_exp.get("company"):
                    cur_exp["role"] = cur_exp.pop("company")
                    cur_exp["company"] = ""
                experiences.append(cur_exp)
            cur_exp = None

        for idx, ln in enumerate(exp_lines):
            is_bullet = ln.startswith(("- ", "* "))
            if is_bullet:
                if cur_exp is None:
                    cur_exp = {
                        "role": "Experience",
                        "company": "",
                        "period": pending_period,
                        "location": pending_location,
                        "bullets": [],
                    }
                    pending_period = ""
                    pending_location = ""
                cur_exp["bullets"].append(ln[2:].strip())
                continue

            # Europass sub-metadata inside an entry (e.g. Cidade: Covilhã | País: Portugal)
            if ENTRY_META_PREFIX_RE.match(ln):
                if cur_exp is not None and not cur_exp["location"]:
                    for part in ln.split("|"):
                        if re.match(r"^\s*(?:cidade|localidade|city)\s*:", part, re.IGNORECASE):
                            cur_exp["location"] = part.split(":", 1)[1].strip()[:80]
                            break
                continue

            date_m = DATE_RANGE_RE.search(ln)
            if date_m:
                period_val = date_m.group(1).strip()
                rest = DATE_RANGE_RE.sub("", ln.lstrip("#").strip())
                rest = re.sub(r"\([^)]*(?:ano|anos|mês|meses|year|years|month|months)\)", "", rest, flags=re.IGNORECASE)
                rest = rest.strip(" -|•—–()")

                if not rest or cls._looks_like_location(rest):
                    if cur_exp and not cur_exp["period"] and not cur_exp["bullets"]:
                        cur_exp["period"] = period_val
                        if rest and not cur_exp["location"]:
                            cur_exp["location"] = rest
                        continue
                    _flush()
                    pending_period = period_val
                    pending_location = rest
                    continue

            if pending_period and not pending_location and cls._looks_like_location(ln):
                pending_location = ln.lstrip("#-•– ").strip()
                continue

            # Check if a short standalone line after bullets introduces a new role/company entry (date in next 2 lines)
            next_has_date = any(
                not exp_lines[j].startswith(("- ", "* ")) and DATE_RANGE_RE.search(exp_lines[j])
                for j in range(idx + 1, min(idx + 3, len(exp_lines)))
            )
            prev_bullet_complete = bool(
                cur_exp and cur_exp["bullets"] and cur_exp["bullets"][-1].rstrip().endswith((".", "!", "?", ";"))
            )
            looks_like_continuation = bool(
                cur_exp is not None
                and len(cur_exp["bullets"]) > 0
                and not ln.startswith("#")
                and not date_m
                and not next_has_date
                and not any(sep in ln for sep in (" — ", " @ ", " | "))
                and not (len(ln) < 60 and " - " in ln)
                and (re.match(r"^[a-zà-ÿ,;.)\]%]", ln) or not prev_bullet_complete)
            )
            if looks_like_continuation:
                cur_exp["bullets"][-1] = f"{cur_exp['bullets'][-1]} {ln}".strip()
                continue

            has_sep = any(sep in ln for sep in (" — ", " | ", " @ ", " - "))
            if ln.startswith("## ") or ln.startswith("### ") or date_m or (len(ln) < 120 and has_sep) or pending_period or (next_has_date and prev_bullet_complete):
                if cur_exp and not cur_exp["company"] and not cur_exp["bullets"] and not date_m and not has_sep:
                    cur_exp["company"] = ln.lstrip("#").strip()[:90]
                    continue

                _flush()

                heading = ln.lstrip("#").strip()
                period = date_m.group(1).strip() if date_m else pending_period
                loc_val = pending_location
                pending_period = ""
                pending_location = ""

                if date_m:
                    heading = DATE_RANGE_RE.sub("", heading)
                    heading = re.sub(r"\([^)]*(?:ano|anos|mês|meses|year|years|month|months)\)", "", heading, flags=re.IGNORECASE)
                    heading = heading.strip(" -|•—–()")

                role = heading
                company = ""
                for sep in (" — ", " @ ", " | ", " - "):
                    if sep in heading:
                        parts = [p.strip() for p in heading.split(sep) if p.strip()]
                        if len(parts) >= 2:
                            if not loc_val and cls._looks_like_location(parts[-1]):
                                loc_val = parts.pop()
                            if len(parts) >= 2:
                                role, company = parts[0], parts[1]
                            elif len(parts) == 1:
                                role = parts[0]
                        break

                cur_exp = {
                    "role": role.lstrip("-–• ") or "Role",
                    "company": company,
                    "period": period,
                    "location": loc_val,
                    "bullets": [],
                }
            elif cur_exp is not None:
                if not cur_exp["company"] and not cur_exp["bullets"]:
                    cur_exp["company"] = ln[:90]
                elif not cur_exp["location"] and cls._looks_like_location(ln):
                    cur_exp["location"] = ln.strip(" -|•—–()")
                else:
                    cur_exp["bullets"].append(ln)

        _flush()
        return experiences

    @staticmethod
    def _infer_education_status(period: str, context: str = "") -> Tuple[bool, str]:
        """Detect whether an education entry is still in progress and extract its start year."""
        combined = f"{period} {context}".strip().lower()
        ongoing_re = re.compile(
            r"\b(?:present(?:e)?|atual(?:mente)?|actual(?:mente|idad)?|current(?:ly)?|ongoing|heute|now|"
            r"em\s+curso|a\s+decorrer|en\s+curso|in\s+progress|laufend|expected|previs[aã]o)\b|至今|현재|الحاضر",
            re.IGNORECASE,
        )
        years = re.findall(r"\b(?:19|20)\d{2}\b", period or context)
        start_year = years[0] if years else ""
        current_year = datetime.now().year
        future_end = bool(len(years) >= 2 and int(years[-1]) > current_year)
        since_only = bool(
            start_year and len(years) == 1 and re.search(r"\b(?:desde|since|seit|ab|desde\s+o\s+ano|in[ií]cio)\b", combined)
        )
        in_progress = bool(ongoing_re.search(combined) or future_end or since_only)
        return in_progress, start_year

    @classmethod
    def _parse_educations(cls, edu_lines: List[str]) -> List[Dict[str, Any]]:
        """Parse education entries cleanly while filtering Europass metadata/grade lines."""
        educations: List[Dict[str, Any]] = []
        pending_edu_period = ""

        def _make_edu(deg: str, inst: str, per: str, extra: str = "") -> Dict[str, Any]:
            in_prog, st_year = cls._infer_education_status(per, f"{deg} {extra}")
            return {
                "degree": deg,
                "institution": inst,
                "period": per,
                "in_progress": in_prog,
                "start_year": st_year,
            }

        for ln in edu_lines:
            is_bullet = ln.startswith(("- ", "* "))
            clean = ln.lstrip("#-*• ").strip()
            if not clean:
                continue

            if ENTRY_META_PREFIX_RE.match(clean):
                continue

            dm = DATE_RANGE_RE.search(clean)
            since_m = re.search(r"\b(?:desde|since|seit|ab)\s+((?:19|20)\d{2})\b", clean, re.IGNORECASE)
            period = dm.group(1).strip() if dm else (since_m.group(0).strip() if since_m else "")
            txt = DATE_RANGE_RE.sub("", clean)
            if not dm and since_m:
                txt = txt.replace(since_m.group(0), "")
            txt = txt.strip(" -|•—–()")

            if (dm or since_m) and (not txt or cls._looks_like_location(txt)):
                if educations and not educations[-1]["period"]:
                    educations[-1]["period"] = period
                    in_prog, st_year = cls._infer_education_status(period, educations[-1]["degree"])
                    educations[-1]["in_progress"] = in_prog
                    educations[-1]["start_year"] = st_year
                else:
                    pending_edu_period = period
                continue

            # Ignore thesis/description bullet notes under a degree once degree+institution exist
            if is_bullet and educations and educations[-1]["institution"] and not dm:
                continue

            resolved_period = period or pending_edu_period
            pending_edu_period = ""

            split_done = False
            for sep in (" — ", " | ", " - "):
                if sep in txt:
                    deg, inst = [p.strip() for p in txt.split(sep, 1)]
                    if cls._looks_like_location(inst):
                        educations.append(_make_edu(deg, "", resolved_period, clean))
                    else:
                        educations.append(_make_edu(deg, inst, resolved_period, clean))
                    split_done = True
                    break

            if split_done:
                continue

            if ", " in txt:
                left, right = [p.strip() for p in txt.split(", ", 1)]
                if cls._looks_like_institution(right):
                    educations.append(_make_edu(left, right, resolved_period, clean))
                    continue

            if educations and not educations[-1]["institution"] and not dm and not ln.startswith("##"):
                educations[-1]["institution"] = txt
                if resolved_period and not educations[-1]["period"]:
                    educations[-1]["period"] = resolved_period
                    in_prog, st_year = cls._infer_education_status(resolved_period, educations[-1]["degree"])
                    educations[-1]["in_progress"] = in_prog
                    educations[-1]["start_year"] = st_year
            elif educations and cls._looks_like_location(txt) and not dm:
                continue
            else:
                educations.append(_make_edu(txt, "", resolved_period, clean))

        return educations

    @classmethod
    def _heuristic_extract(cls, md_text: str, user_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic multi-language profile extraction from Markdown CV text."""
        lines = [ln.strip() for ln in md_text.splitlines() if ln.strip()]
        full_text = "\n".join(lines)
        contact = cls._extract_contact_fields(lines, full_text, user_doc)

        sections: Dict[str, List[str]] = {
            "personal_info": [], "summary": [], "experience": [], "education": [],
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
            ln.lstrip("#- ").strip()
            for ln in sections["summary"]
            if not ln.startswith("#") and not PERSONAL_LABEL_RE.match(ln)
        ).strip()

        skills: List[str] = []
        for ln in sections["skills"]:
            clean_ln = re.sub(r"^[-*•●▪◦]\s*", "", ln)
            clean_ln = re.sub(r"^[A-Za-zÀ-ÿ\s/&]+:\s*", "", clean_ln)
            if clean_ln.lower() in CEFR_NOISE_TOKENS:
                continue
            for tok in re.split(r"[,;|•·●▪/]", clean_ln):
                skill = tok.strip(" .:-")
                low_skill = skill.lower()
                if (
                    skill
                    and (len(skill) > 1 or skill.upper() in {"C", "R"})
                    and len(skill) <= 45
                    and len(skill.split()) <= 5
                    and low_skill not in CEFR_NOISE_TOKENS
                    and not skill.endswith((".", ","))
                    and skill not in skills
                ):
                    skills.append(skill)

        experiences = cls._parse_experiences(sections["experience"])
        educations = cls._parse_educations(sections["education"])

        projects: List[Dict[str, Any]] = []
        for ln in sections["projects"]:
            clean = ln.lstrip("#- ").strip()
            if clean:
                if ":" in clean and not clean.lower().startswith("http"):
                    title, desc = [p.strip() for p in clean.split(":", 1)]
                    projects.append({"title": title[:80], "tech": "", "description": desc})
                else:
                    projects.append({"title": clean[:80], "tech": "", "description": ""})

        certifications: List[Dict[str, Any]] = []
        for ln in sections["certifications"]:
            clean = ln.lstrip("#- ").strip()
            if clean and not ENTRY_META_PREFIX_RE.match(clean):
                if " - " in clean or " — " in clean:
                    sep = " — " if " — " in clean else " - "
                    name, issuer = [p.strip() for p in clean.split(sep, 1)]
                    certifications.append({"name": name, "issuer": issuer})
                else:
                    certifications.append({"name": clean, "issuer": ""})

        languages: List[Dict[str, Any]] = []
        seen_langs: set[str] = set()
        for ln in sections["languages"]:
            clean = ln.lstrip("#- ").strip()
            if not clean or clean.lower() in CEFR_NOISE_TOKENS or "compreensão" in clean.lower() or "autoavaliação" in clean.lower():
                continue
            # Handle Europass "Língua(s) materna(s): Português"
            if re.match(r"^l[ií]ngua\(s\)\s+materna\(s\)\s*:", clean, re.IGNORECASE):
                native_val = clean.split(":", 1)[1].strip()
                for lang_name in re.split(r"[,;/]", native_val):
                    n = lang_name.strip()
                    if n and n.lower() not in seen_langs:
                        seen_langs.add(n.lower())
                        languages.append({"name": n, "level": "Nativo"})
                continue
            clean = re.sub(r"^outra\(s\)\s+l[ií]ngua\(s\)\s*:\s*", "", clean, flags=re.IGNORECASE)
            for item in re.split(r"[,;|]", clean):
                part = item.strip()
                if not part or part.lower() in CEFR_NOISE_TOKENS:
                    continue
                cefr_match = re.match(r"^([A-Za-zÀ-ÿ\s]{2,25}?)\s+([ABC][12](?:\s+[ABC][12])*)\s*$", part)
                if cefr_match:
                    name = cefr_match.group(1).strip()
                    level = cefr_match.group(2).split()[0]
                elif ":" in part:
                    name, level = [p.strip() for p in part.split(":", 1)]
                elif "(" in part and ")" in part:
                    name = part.split("(", 1)[0].strip()
                    level = part.split("(", 1)[1].rstrip(")").strip()
                elif " - " in part:
                    name, level = [p.strip() for p in part.split(" - ", 1)]
                else:
                    name, level = part, ""

                if name and len(name) <= 35 and name.lower() not in CEFR_NOISE_TOKENS and name.lower() not in seen_langs:
                    seen_langs.add(name.lower())
                    languages.append({"name": name, "level": level})

        verified_facts: List[str] = []
        for exp in experiences:
            for b in exp.get("bullets", []):
                if re.search(r"\d+%|\$\d+|€\d+|\d+x|\d+\+", b) and b not in verified_facts:
                    verified_facts.append(b)
                    if len(verified_facts) >= 8:
                        break

        return {
            **contact,
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
        raw_text, ext, line_meta = cls._extract_with_metadata(filename, content)
        fallback_md = cls._normalize_to_markdown(raw_text, ext, line_meta=line_meta)
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
    "educations": [{{"degree": "string", "institution": "string", "period": "string", "in_progress": true, "start_year": "string"}}],
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
            if not isinstance(parsed, dict) or ("cv_markdown" not in parsed and "profile" not in parsed):
                raise ValueError("Resposta LLM sem campos cv_markdown/profile")

            ai_md = (parsed.get("cv_markdown") or "").strip() or fallback_md
            ai_prof = parsed.get("profile") or {}
            merged_profile = {**fallback_profile, **{k: v for k, v in ai_prof.items() if v not in (None, "", [])}}
            enriched_edus = []
            for edu in merged_profile.get("educations") or []:
                if isinstance(edu, dict):
                    in_prog, st_year = cls._infer_education_status(str(edu.get("period") or ""), str(edu.get("degree") or ""))
                    enriched_edus.append({
                        **edu,
                        "in_progress": edu["in_progress"] if isinstance(edu.get("in_progress"), bool) else in_prog,
                        "start_year": edu.get("start_year") or st_year,
                    })
            merged_profile["educations"] = enriched_edus
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
