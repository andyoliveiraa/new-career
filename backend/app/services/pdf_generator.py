import os
import re
import urllib.parse
from typing import Dict, Any, List, Optional
from jinja2 import Environment, select_autoescape
import logging

logger = logging.getLogger(__name__)

_HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_SAFE_FONT_RE = re.compile(r"^[A-Za-z0-9 \-]+$")
_DATA_IMAGE_RE = re.compile(r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$", re.IGNORECASE)
_JINJA_ENV = Environment(autoescape=select_autoescape(["html", "xml"]))

MODERN_CV_TEMPLATE = """<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>{{ profile.full_name }} - CV</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <style>
        @import url('https://fonts.googleapis.com/css2?family={{ font_family_url }}:ital,wght@0,300..700;1,300..700{% if font_heading_url and font_heading_url != font_family_url %}&family={{ font_heading_url }}:ital,wght@0,300..700;1,300..700{% endif %}&display=swap');

        @page {
            size: A4;
            margin: 12mm 14mm 12mm 14mm;
        }

        :root {
            --primary: {{ accent_color }};
            --text-main: #0f172a;
            --text-muted: #475569;
            --border-color: #e2e8f0;
            --bg-light: #f8fafc;
            --font-body: '{{ font_family }}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-head: '{{ font_heading or font_family }}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-body);
            font-size: {{ body_font_size }};
            line-height: 1.45;
            color: #1e293b;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        a {
            color: var(--primary);
            text-decoration: none;
        }

        /* ==================== LAYOUT: CLASSIC ATS ==================== */
        .cv-classic-ats .header {
            margin-bottom: 14px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--primary);
        }

        .cv-classic-ats .header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .cv-classic-ats .name {
            font-family: var(--font-head);
            font-size: 20pt;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: var(--text-main);
            line-height: 1.1;
            margin-bottom: 3px;
        }

        .cv-classic-ats .headline {
            font-size: 11pt;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 6px;
        }

        .contact-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 10px 14px;
            font-size: 9pt;
            color: var(--text-muted);
        }

        .contact-item {
            display: inline-flex;
            align-items: center;
        }

        .profile-photo {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--primary);
            flex-shrink: 0;
        }

        .section {
            margin-bottom: 14px;
        }

        .section-title {
            font-family: var(--font-head);
            font-size: 10.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--primary);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 3px;
            margin-bottom: 8px;
        }

        .summary-text {
            color: #334155;
            text-align: justify;
            font-size: 9.5pt;
            line-height: 1.5;
        }

        .item {
            margin-bottom: 10px;
            page-break-inside: avoid;
        }

        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 2px;
        }

        .role-title {
            font-weight: 700;
            font-size: 10pt;
            color: #0f172a;
        }

        .company-name {
            font-weight: 600;
            color: var(--primary);
        }

        .period-location {
            font-size: 8.5pt;
            color: #64748b;
            text-align: right;
            white-space: nowrap;
        }

        .bullets {
            margin-left: 16px;
            margin-top: 3px;
        }

        .bullets li {
            margin-bottom: 2px;
            color: #334155;
            font-size: 9pt;
            line-height: 1.4;
        }

        .skills-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        .skill-tag {
            font-size: 8.5pt;
            background: #f1f5f9;
            color: #1e293b;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            font-weight: 500;
        }

        /* ==================== LAYOUT: MODERN SPLIT ==================== */
        .cv-modern-split {
            display: flex;
            gap: 20px;
        }

        .cv-modern-split .sidebar {
            width: 32%;
            background-color: var(--bg-light);
            border-right: 1px solid var(--border-color);
            padding-right: 14px;
            flex-shrink: 0;
        }

        .cv-modern-split .main-col {
            width: 68%;
            flex-grow: 1;
        }

        .cv-modern-split .sidebar-photo-container {
            text-align: center;
            margin-bottom: 12px;
        }

        .cv-modern-split .sidebar-photo {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid var(--primary);
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }

        .cv-modern-split .sidebar .name {
            font-family: var(--font-head);
            font-size: 15pt;
            font-weight: 700;
            color: var(--text-main);
            line-height: 1.2;
            margin-bottom: 4px;
        }

        .cv-modern-split .sidebar .headline {
            font-size: 9.5pt;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 12px;
        }

        .cv-modern-split .sidebar-contact {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 8.5pt;
            color: var(--text-muted);
            margin-bottom: 16px;
            word-break: break-all;
        }

        /* ==================== LAYOUT: TECH MINIMAL ==================== */
        .cv-tech-minimal .header {
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 2px dashed var(--primary);
        }

        .cv-tech-minimal .name {
            font-family: var(--font-head);
            font-size: 21pt;
            font-weight: 700;
            letter-spacing: -0.03em;
            color: var(--text-main);
        }

        .cv-tech-minimal .section-title {
            font-family: var(--font-head);
            font-size: 10pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: var(--primary);
            border-bottom: 1px solid #cbd5e1;
        }

        .cv-tech-minimal .skill-tag {
            font-family: monospace;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 3px solid var(--primary);
        }

        /* ==================== LAYOUT: COMPACT EXECUTIVE ==================== */
        .cv-compact-executive .header {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        }

        .cv-compact-executive .header-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        }

        .cv-compact-executive .contact-bar {
            justify-content: center;
        }

        .cv-compact-executive .section-title {
            text-align: center;
            position: relative;
            border-bottom: none;
            margin-bottom: 12px;
        }

        .cv-compact-executive .section-title::before,
        .cv-compact-executive .section-title::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 25%;
            height: 1px;
            background-color: var(--border-color);
        }

        .cv-compact-executive .section-title::before { left: 0; }
        .cv-compact-executive .section-title::after { right: 0; }
    </style>
</head>
<body class="cv-{{ layout_class }}">

{% if layout_class == 'modern-split' %}
    <!-- MODERN SPLIT LAYOUT -->
    <div class="cv-modern-split">
        <aside class="sidebar">
            {% if has_photo and photo_url %}
            <div class="sidebar-photo-container">
                <img src="{{ photo_url }}" alt="{{ profile.full_name }}" class="sidebar-photo" />
            </div>
            {% endif %}
            <div class="name">{{ profile.full_name }}</div>
            <div class="headline">{{ profile.headline or 'Profissional Qualificado' }}</div>

            <div class="sidebar-contact">
                {% if profile.email %}<div><strong>Email:</strong> {{ profile.email }}</div>{% endif %}
                {% if profile.phone %}<div><strong>Tel:</strong> {{ profile.phone }}</div>{% endif %}
                {% if profile.location %}<div><strong>Local:</strong> {{ profile.location }}</div>{% endif %}
                {% if profile.linkedin_url %}<div><strong>LinkedIn:</strong> {{ profile.linkedin_url }}</div>{% endif %}
                {% if profile.github_url %}<div><strong>GitHub:</strong> {{ profile.github_url }}</div>{% endif %}
                {% if profile.portfolio_url %}<div><strong>Web:</strong> {{ profile.portfolio_url }}</div>{% endif %}
            </div>

            {% if visibility.skills and (highlighted_skills or profile.skills) %}
            <div class="section">
                <h3 class="section-title">Competências</h3>
                <div class="skills-grid">
                    {% for skill in (highlighted_skills or profile.skills) %}
                    <span class="skill-tag">{{ skill }}</span>
                    {% endfor %}
                </div>
            </div>
            {% endif %}

            {% if visibility.educations and profile.educations %}
            <div class="section">
                <h3 class="section-title">Formação</h3>
                {% for edu in profile.educations %}
                <div class="item">
                    <div class="role-title">{{ edu.degree }}</div>
                    {% if edu.institution %}<div class="company-name">{{ edu.institution }}</div>{% endif %}
                    <div class="period-location">{{ edu.period }}</div>
                </div>
                {% endfor %}
            </div>
            {% endif %}

            {% if visibility.languages and profile.languages %}
            <div class="section">
                <h3 class="section-title">Idiomas</h3>
                {% for lang in profile.languages %}
                <div style="font-size: 8.5pt; margin-bottom: 2px;">
                    <strong>{{ lang.name or lang.language or lang }}:</strong> {{ lang.level or 'Fluente' }}
                </div>
                {% endfor %}
            </div>
            {% endif %}
        </aside>

        <main class="main-col">
            {% for block in blocks_order %}
                {% if block == 'summary' and visibility.summary and (tailored_summary or profile.summary) %}
                <div class="section">
                    <h2 class="section-title">Resumo Profissional</h2>
                    <div class="summary-text">{{ tailored_summary or profile.summary }}</div>
                </div>
                {% elif block == 'experiences' and visibility.experiences and (tailored_experiences or profile.experiences) %}
                <div class="section">
                    <h2 class="section-title">Experiência Profissional</h2>
                    {% for exp in (tailored_experiences or profile.experiences) %}
                    <div class="item">
                        <div class="item-header">
                            <div>
                                <span class="role-title">{{ exp.role }}</span>
                                {% if exp.company %} — <span class="company-name">{{ exp.company }}</span>{% endif %}
                            </div>
                            <div class="period-location">
                                {{ exp.period }}{% if exp.location %} | {{ exp.location }}{% endif %}
                            </div>
                        </div>
                        {% if exp.bullets %}
                        <ul class="bullets">
                            {% for bullet in exp.bullets %}
                            <li>{{ bullet }}</li>
                            {% endfor %}
                        </ul>
                        {% endif %}
                    </div>
                    {% endfor %}
                </div>
                {% elif block == 'projects' and visibility.projects and profile.projects %}
                <div class="section">
                    <h2 class="section-title">Projetos de Destaque</h2>
                    {% for proj in profile.projects %}
                    <div class="item">
                        <div class="item-header">
                            <span class="role-title">{{ proj.title or proj.name }}</span>
                            {% if proj.tech %}<span class="company-name">{{ proj.tech }}</span>{% endif %}
                        </div>
                        <div class="summary-text">{{ proj.description }}</div>
                    </div>
                    {% endfor %}
                </div>
                {% elif block == 'certifications' and visibility.certifications and profile.certifications %}
                <div class="section">
                    <h2 class="section-title">Certificações</h2>
                    {% for cert in profile.certifications %}
                    <div class="item">
                        <div class="role-title">{{ cert.name or cert.title }}</div>
                        {% if cert.issuer %}<div class="company-name">{{ cert.issuer }}</div>{% endif %}
                    </div>
                    {% endfor %}
                </div>
                {% endif %}
            {% endfor %}
        </main>
    </div>

{% else %}
    <!-- LINEAR LAYOUTS: CLASSIC ATS, COMPACT EXECUTIVE, TECH MINIMAL -->
    <header class="header">
        <div class="header-top">
            <div>
                <h1 class="name">{{ profile.full_name }}</h1>
                <div class="headline">{{ profile.headline or 'Engenheiro de Software' }}</div>
            </div>
            {% if has_photo and photo_url %}
            <img src="{{ photo_url }}" alt="{{ profile.full_name }}" class="profile-photo" />
            {% endif %}
        </div>
        <div class="contact-bar">
            {% if profile.email %}<span class="contact-item">✉ {{ profile.email }}</span>{% endif %}
            {% if profile.phone %}<span class="contact-item">☏ {{ profile.phone }}</span>{% endif %}
            {% if profile.location %}<span class="contact-item">📍 {{ profile.location }}</span>{% endif %}
            {% if profile.linkedin_url %}<span class="contact-item">🔗 {{ profile.linkedin_url }}</span>{% endif %}
            {% if profile.github_url %}<span class="contact-item">💻 {{ profile.github_url }}</span>{% endif %}
            {% if profile.portfolio_url %}<span class="contact-item">🌐 {{ profile.portfolio_url }}</span>{% endif %}
        </div>
    </header>

    {% for block in blocks_order %}
        {% if block == 'summary' and visibility.summary and (tailored_summary or profile.summary) %}
        <div class="section">
            <h2 class="section-title">Resumo Profissional</h2>
            <div class="summary-text">{{ tailored_summary or profile.summary }}</div>
        </div>

        {% elif block == 'skills' and visibility.skills and (highlighted_skills or profile.skills) %}
        <div class="section">
            <h2 class="section-title">Competências Técnicas</h2>
            <div class="skills-grid">
                {% for skill in (highlighted_skills or profile.skills) %}
                <span class="skill-tag">{{ skill }}</span>
                {% endfor %}
            </div>
        </div>

        {% elif block == 'experiences' and visibility.experiences and (tailored_experiences or profile.experiences) %}
        <div class="section">
            <h2 class="section-title">Experiência Profissional</h2>
            {% for exp in (tailored_experiences or profile.experiences) %}
            <div class="item">
                <div class="item-header">
                    <div>
                        <span class="role-title">{{ exp.role }}</span>
                        {% if exp.company %} — <span class="company-name">{{ exp.company }}</span>{% endif %}
                    </div>
                    <div class="period-location">
                        {{ exp.period }}{% if exp.location %} | {{ exp.location }}{% endif %}
                    </div>
                </div>
                {% if exp.bullets %}
                <ul class="bullets">
                    {% for bullet in exp.bullets %}
                    <li>{{ bullet }}</li>
                    {% endfor %}
                </ul>
                {% endif %}
            </div>
            {% endfor %}
        </div>

        {% elif block == 'educations' and visibility.educations and profile.educations %}
        <div class="section">
            <h2 class="section-title">Formação Académica</h2>
            {% for edu in profile.educations %}
            <div class="item">
                <div class="item-header">
                    <div>
                        <span class="role-title">{{ edu.degree }}</span>
                        {% if edu.institution %} — <span class="company-name">{{ edu.institution }}</span>{% endif %}
                    </div>
                    <div class="period-location">{{ edu.period }}</div>
                </div>
            </div>
            {% endfor %}
        </div>

        {% elif block == 'projects' and visibility.projects and profile.projects %}
        <div class="section">
            <h2 class="section-title">Projetos</h2>
            {% for proj in profile.projects %}
            <div class="item">
                <div class="item-header">
                    <span class="role-title">{{ proj.title or proj.name }}</span>
                    {% if proj.tech %}<span class="company-name">{{ proj.tech }}</span>{% endif %}
                </div>
                <div class="summary-text">{{ proj.description }}</div>
            </div>
            {% endfor %}
        </div>

        {% elif block == 'certifications' and visibility.certifications and profile.certifications %}
        <div class="section">
            <h2 class="section-title">Certificações</h2>
            {% for cert in profile.certifications %}
            <div class="item">
                <div class="role-title">{{ cert.name or cert.title }}</div>
                {% if cert.issuer %}<div class="company-name">{{ cert.issuer }}</div>{% endif %}
            </div>
            {% endfor %}
        </div>

        {% elif block == 'languages' and visibility.languages and profile.languages %}
        <div class="section">
            <h2 class="section-title">Idiomas</h2>
            <div class="skills-grid">
                {% for lang in profile.languages %}
                <span class="skill-tag">{{ lang.name or lang.language or lang }}{% if lang.level %} ({{ lang.level }}){% endif %}</span>
                {% endfor %}
            </div>
        </div>
        {% endif %}
    {% endfor %}

{% endif %}

</body>
</html>
"""

class PDFGeneratorService:
    @staticmethod
    def render_html(
        profile_dict: Dict[str, Any],
        tailored_summary: str = "",
        tailored_experiences: List[Dict[str, Any]] = None,
        highlighted_skills: List[str] = None,
        template_config: Optional[Dict[str, Any]] = None
    ) -> str:
        cfg = template_config or {}

        # Sanitize styling parameters defensively
        raw_font = (cfg.get("font_family") or "Inter").strip()
        font_family = raw_font if _SAFE_FONT_RE.match(raw_font) else "Inter"

        raw_heading = (cfg.get("font_heading") or font_family).strip()
        font_heading = raw_heading if _SAFE_FONT_RE.match(raw_heading) else font_family

        raw_color = (cfg.get("accent_color") or "#2563eb").strip()
        accent_color = raw_color if _HEX_COLOR_RE.match(raw_color) else "#2563eb"

        layout = cfg.get("layout") or "classic_ats"
        has_photo = bool(cfg.get("has_photo", False))

        raw_photo = (cfg.get("photo_url") or "").strip()
        if raw_photo and (raw_photo.startswith(("https://", "http://")) or _DATA_IMAGE_RE.match(raw_photo)):
            photo_url = raw_photo
        else:
            photo_url = ""

        # Normalize layout CSS class
        layout_class = layout.replace("_", "-")

        # Normalize Google Fonts URL parameters
        font_family_url = urllib.parse.quote_plus(font_family)
        font_heading_url = urllib.parse.quote_plus(font_heading) if font_heading else font_family_url

        # Font size scale
        font_scale = cfg.get("font_size_scale", "normal")
        body_font_size = "9.5pt" if font_scale == "compact" else ("11pt" if font_scale == "spacious" else "10pt")

        # Blocks order & visibility
        default_blocks = ["summary", "skills", "experiences", "educations", "certifications", "projects", "languages"]
        blocks_order = cfg.get("blocks_order") or default_blocks
        visibility = cfg.get("block_visibility") or {b: True for b in default_blocks}

        template = _JINJA_ENV.from_string(MODERN_CV_TEMPLATE)
        return template.render(
            profile=profile_dict,
            tailored_summary=tailored_summary,
            tailored_experiences=tailored_experiences or profile_dict.get("experiences", []),
            highlighted_skills=highlighted_skills or profile_dict.get("skills", []),
            layout_class=layout_class,
            font_family=font_family,
            font_heading=font_heading,
            font_family_url=font_family_url,
            font_heading_url=font_heading_url,
            accent_color=accent_color,
            has_photo=has_photo,
            photo_url=photo_url,
            body_font_size=body_font_size,
            blocks_order=blocks_order,
            visibility=visibility
        )

    @staticmethod
    async def generate_pdf(html_content: str, output_path: str) -> str:
        """Render HTML to A4 PDF using Playwright with fallback to HTML file if browser is not installed."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        html_path = output_path.replace(".pdf", ".html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.set_content(html_content, wait_until="networkidle")
                await page.pdf(
                    path=output_path,
                    format="A4",
                    print_background=True,
                    margin={"top": "12mm", "bottom": "12mm", "left": "14mm", "right": "14mm"}
                )
                await browser.close()
                return output_path
        except Exception as e:
            logger.warning(f"Playwright PDF generation failed, returning HTML path: {e}")
            return html_path
