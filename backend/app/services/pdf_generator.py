import os
from typing import Dict, Any, List
from jinja2 import Template
import logging

logger = logging.getLogger(__name__)

CV_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <title>{{ profile.full_name }} - CV</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@500;600;700&display=swap');
        
        @page {
            size: A4;
            margin: 14mm 16mm 14mm 16mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10.5pt;
            line-height: 1.5;
            color: #1a1a1a;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
        }

        .header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1.5px solid #2d3748;
        }

        .name {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 22pt;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #0f172a;
            line-height: 1.1;
            margin-bottom: 4px;
        }

        .headline {
            font-size: 12pt;
            font-weight: 500;
            color: #334155;
            margin-bottom: 8px;
        }

        .contact-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 9.5pt;
            color: #475569;
        }

        .contact-item {
            display: inline-flex;
            align-items: center;
        }

        .section {
            margin-bottom: 16px;
        }

        .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 11pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

        .summary-text {
            color: #334155;
            text-align: justify;
            margin-bottom: 8px;
        }

        .item {
            margin-bottom: 12px;
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
            font-size: 11pt;
            color: #1e293b;
        }

        .company-name {
            font-weight: 600;
            color: #2563eb;
        }

        .period-location {
            font-size: 9pt;
            color: #64748b;
            text-align: right;
        }

        .bullets {
            margin-left: 18px;
            margin-top: 4px;
        }

        .bullets li {
            margin-bottom: 3px;
            color: #334155;
        }

        .skills-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .skill-tag {
            font-size: 9pt;
            background: #f1f5f9;
            color: #1e293b;
            padding: 2px 8px;
            border-radius: 3px;
            border: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="name">{{ profile.full_name }}</h1>
        <div class="headline">{{ profile.headline or 'Engenheiro de Software' }}</div>
        <div class="contact-bar">
            {% if profile.email %}<span class="contact-item">{{ profile.email }}</span>{% endif %}
            {% if profile.phone %}<span class="contact-item">{{ profile.phone }}</span>{% endif %}
            {% if profile.location %}<span class="contact-item">{{ profile.location }}</span>{% endif %}
            {% if profile.linkedin_url %}<span class="contact-item">{{ profile.linkedin_url }}</span>{% endif %}
            {% if profile.github_url %}<span class="contact-item">{{ profile.github_url }}</span>{% endif %}
        </div>
    </div>

    {% if tailored_summary or profile.summary %}
    <div class="section">
        <h2 class="section-title">Resumo Profissional</h2>
        <div class="summary-text">{{ tailored_summary or profile.summary }}</div>
    </div>
    {% endif %}

    {% if highlighted_skills or profile.skills %}
    <div class="section">
        <h2 class="section-title">Competências Técnicas</h2>
        <div class="skills-grid">
            {% for skill in (highlighted_skills or profile.skills) %}
            <span class="skill-tag">{{ skill }}</span>
            {% endfor %}
        </div>
    </div>
    {% endif %}

    {% if tailored_experiences or profile.experiences %}
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
    {% endif %}

    {% if profile.educations %}
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
    {% endif %}
</body>
</html>
"""

class PDFGeneratorService:
    @staticmethod
    def render_html(profile_dict: Dict[str, Any], tailored_summary: str = "", tailored_experiences: List[Dict[str, Any]] = None, highlighted_skills: List[str] = None) -> str:
        template = Template(CV_HTML_TEMPLATE)
        return template.render(
            profile=profile_dict,
            tailored_summary=tailored_summary,
            tailored_experiences=tailored_experiences or profile_dict.get("experiences", []),
            highlighted_skills=highlighted_skills or profile_dict.get("skills", [])
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
                    margin={"top": "14mm", "bottom": "14mm", "left": "16mm", "right": "16mm"}
                )
                await browser.close()
                return output_path
        except Exception as e:
            logger.warning(f"Playwright PDF generation failed, returning HTML path: {e}")
            return html_path
