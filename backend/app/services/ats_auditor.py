import re
from typing import Dict, Any, List, Optional
from backend.app.schemas.cv_template import ATSAuditResponse, ATSAuditCheckItem, CVTemplateBase

class ATSAuditorService:
    METRIC_PATTERNS = [
        r'\b\d+(?:[.,]\d+)?%',
        r'[\$€£]\s*\d+(?:[.,]\d+)?\s*[kKmM]?',
        r'\b\d+(?:[.,]\d+)?\s*[kKmM]\b',
        r'\b\d+\s*(?:usuários|utilizadores|users|clientes|clients|membros|pessoas|anos|years|meses|months|projetos|projects|sprints|ms|horas|hours|equipa|team)\b',
        r'\+\s*\d+',
        r'\b\d+\b'
    ]

    ACTION_VERBS = {
        "pt": [
            # 3rd person & infinitive
            "desenvolveu", "implementou", "liderou", "otimizou", "reduziu", "aumentou",
            "criou", "geriu", "coordenou", "concebeu", "automatizou", "reestruturou",
            "integrou", "acelerou", "construiu", "arquitetou", "alcançou", "superou",
            "supervisionou", "monitorizou", "administrou", "planeou", "planejou", "negociou",
            "realizou", "executou", "articulou", "acompanhou", "garantiu", "assegurando",
            "assegurar", "promovendo", "promoveu", "captou", "fidelizou",
            "desenvolver", "implementar", "liderar", "otimizar", "criar", "coordenar",
            # 1st person
            "desenvolvi", "implementei", "liderei", "otimizei", "reduzi", "aumentei",
            "criei", "geri", "coordenei", "automatizei", "reestruturei", "integrei",
            "supervisionei", "monitorizei", "administrei", "planeei", "planejei", "negociei",
            "realizei", "executei", "articulei", "acompanhei", "garanti",
            # Nominal action stems (very common in Portuguese/Europass CVs)
            "coordenação", "gestão", "planeamento", "planejamento", "supervisão",
            "implementação", "monitorização", "administração", "desenvolvimento",
            "otimização", "resolução", "liderança", "criação", "execução",
            "negociação", "captação", "fidelização", "articulação", "acompanhamento",
            "estruturação", "manutenção", "comercialização", "cumprimento"
        ],
        "en": [
            "developed", "implemented", "led", "optimized", "reduced", "increased",
            "created", "managed", "coordinated", "designed", "automated", "restructured",
            "integrated", "accelerated", "built", "architected", "achieved", "delivered",
            "spearheaded", "engineered", "scaled", "orchestrated", "streamlined",
            "mentored", "launched", "pioneered", "established", "resolved", "negotiated",
            "supervised", "administered", "analyzed", "improved", "drove", "executed"
        ]
    }

    SAFE_ATS_FONTS = {
        "inter", "roboto", "open sans", "lato", "montserrat", "poppins",
        "dm sans", "plus jakarta sans", "work sans", "manrope", "nunito",
        "raleway", "fira sans", "space grotesk", "merriweather", "lora",
        "pt serif", "source sans pro", "arial", "helvetica", "georgia", "times new roman"
    }

    @classmethod
    def audit(cls, template: CVTemplateBase, profile: Dict[str, Any], job_data: Optional[Dict[str, Any]] = None) -> ATSAuditResponse:
        checklist: List[ATSAuditCheckItem] = []
        strengths: List[str] = []
        warnings: List[str] = []
        tips: List[str] = []

        total_score = 0

        # 1. Contact Information Checks (max 18 pts)
        has_email = bool(profile.get("email") and "@" in profile.get("email", ""))
        has_phone = bool(profile.get("phone"))
        has_location = bool(profile.get("location"))
        has_links = bool(profile.get("linkedin_url") or profile.get("github_url") or profile.get("portfolio_url"))

        contact_score = 0
        if has_email:
            contact_score += 6
        if has_phone:
            contact_score += 4
        if has_location:
            contact_score += 4
        if has_links:
            contact_score += 4

        checklist.append(ATSAuditCheckItem(
            id="contact_info",
            label="Dados de Contacto Essenciais",
            passed=(contact_score >= 14),
            importance="high",
            message=f"Email ({'✓' if has_email else '✗'}), Telefone ({'✓' if has_phone else '✗'}), Localização ({'✓' if has_location else '✗'}), Links ({'✓' if has_links else '✗'})."
        ))

        if contact_score >= 18:
            strengths.append("Informação de contacto completa e fácil de extrair pelos sistemas ATS.")
        else:
            if contact_score >= 14:
                strengths.append("Contactos base presentes para indexação de candidatura.")
            if not has_email:
                warnings.append("Falta o endereço de email no perfil: o sistema ATS não conseguirá indexar a candidatura.")
            if not has_phone:
                tips.append("Adicione um número de telefone com indicativo internacional (+351...) para facilitar o contacto de recrutadores.")
            if not has_location:
                tips.append("Indique a sua cidade e país (ex: 'Lisboa, Portugal') para coincidir com filtros geográficos de vagas.")
            if not has_links:
                tips.append("Adicione o seu link do LinkedIn, GitHub ou portfólio no Perfil Mestre para reforçar a credibilidade.")

        total_score += contact_score

        # 2. Section Visibility & Presence (max 18 pts)
        vis = template.block_visibility or {}
        summary_text = (profile.get("summary") or "").strip()
        has_summary = vis.get("summary", True) and bool(summary_text)
        has_exp = vis.get("experiences", True) and bool(profile.get("experiences"))
        has_edu = vis.get("educations", True) and bool(profile.get("educations"))
        has_skills = vis.get("skills", True) and bool(profile.get("skills"))

        section_score = 0
        if has_exp:
            section_score += 7
        if has_skills:
            section_score += 4
        if has_edu:
            section_score += 4
        if has_summary:
            section_score += 3

        checklist.append(ATSAuditCheckItem(
            id="core_sections",
            label="Secções Obrigatórias do CV",
            passed=(section_score >= 15),
            importance="high",
            message=f"Experiência ({'✓' if has_exp else '✗'}), Competências ({'✓' if has_skills else '✗'}), Formação ({'✓' if has_edu else '✗'}), Resumo ({'✓' if has_summary else '✗'})."
        ))

        if section_score >= 15:
            strengths.append("Estrutura padrão de secções reconhecida pelos motores de parsing de RH.")
        else:
            if not has_exp:
                warnings.append("Nenhuma experiência profissional visível. Esta é a secção com maior peso no rastreio.")
            if not has_skills:
                warnings.append("Secção de competências técnicas desativada ou vazia. Reduz significativamente a correspondência de palavras-chave.")
            if not has_edu:
                tips.append("Ative a secção de Formação Académica para validar qualificações formais.")

        if has_summary:
            if len(summary_text) < 60:
                tips.append("Resumo profissional demasiado curto: desenvolva 2 a 4 linhas com especialidade, experiência e foco de impacto.")
            elif len(summary_text) > 700:
                tips.append("Resumo profissional extenso (> 700 caracteres): sintetize em 3 a 4 linhas diretas para facilitar a leitura em 6 segundos.")

        total_score += section_score

        # 3. Action Verbs & Quantifiable Metrics (max 24 pts)
        experiences = profile.get("experiences", [])
        all_bullet_texts = []
        for exp in experiences:
            bullets = exp.get("bullets", [])
            for b in bullets:
                if isinstance(b, str):
                    all_bullet_texts.append(b)

        combined_text = " ".join(all_bullet_texts).lower()

        # Check metrics (deduplicate overlapping spans)
        matched_spans = []
        for pattern in cls.METRIC_PATTERNS:
            for match in re.finditer(pattern, combined_text, flags=re.IGNORECASE):
                span = match.span()
                if not any(s[0] <= span[0] < s[1] or span[0] <= s[0] < span[1] for s in matched_spans):
                    matched_spans.append(span)
        metric_matches = len(matched_spans)

        # Check action verbs / nominal leadership stems
        verb_matches = 0
        for v in cls.ACTION_VERBS["pt"] + cls.ACTION_VERBS["en"]:
            if re.search(r'\b' + re.escape(v) + r'\b', combined_text, flags=re.IGNORECASE):
                verb_matches += 1

        metrics_score = 0
        if metric_matches >= 3:
            metrics_score += 14
        elif metric_matches >= 1:
            metrics_score += 8
        else:
            metrics_score += 2

        if verb_matches >= 4:
            metrics_score += 10
        elif verb_matches >= 2:
            metrics_score += 6
        else:
            metrics_score += 2

        metrics_passed = (metrics_score >= 16)
        checklist.append(ATSAuditCheckItem(
            id="metrics_verbs",
            label="Métricas de Impacto e Verbos de Ação",
            passed=metrics_passed,
            importance="high",
            message=f"Encontradas {metric_matches} métricas quantificáveis e {verb_matches} expressões/verbos de ação."
        ))

        if metrics_passed:
            strengths.append(f"Forte orientação a resultados: identificadas {metric_matches} métricas e {verb_matches} expressões de ação.")
        else:
            if metric_matches < 2:
                warnings.append("Poucas métricas quantitativas identificadas nos pontos de experiência.")
                tips.append("Adicione números e percentagens concretos aos seus bullets (ex: 'Reduziu o tempo de atendimento em 30%', 'Geriu equipa de 5 pessoas').")
            if verb_matches < 2:
                tips.append("Inicie cada ponto com verbos de ação no passado ou substantivos ativos (ex: 'Liderou', 'Otimizou', 'Implementou', 'Coordenação').")

        total_score += metrics_score

        # 4. Skills Categorization & Density (max 14 pts)
        skills = profile.get("skills", [])
        skills_count = len(skills)
        skills_score = 0
        if 8 <= skills_count <= 22:
            skills_score = 14
        elif skills_count > 22:
            skills_score = 11
        elif skills_count >= 5:
            skills_score = 10
        elif skills_count >= 3:
            skills_score = 6
        else:
            skills_score = 2

        skills_passed = (6 <= skills_count <= 24)
        checklist.append(ATSAuditCheckItem(
            id="skills_density",
            label="Densidade de Competências Chave",
            passed=skills_passed,
            importance="medium",
            message=(
                f"O CV contém {skills_count} competências (excesso pode diluir relevância; ideal: 8 a 20)."
                if skills_count > 24
                else f"O CV contém {skills_count} competências indexáveis (ideal: 8 a 20 competências)."
            )
        ))

        if 8 <= skills_count <= 22:
            strengths.append(f"Boa densidade de competências técnicas ({skills_count} listadas) para matching semântico.")
        elif skills_count > 22:
            warnings.append(f"Lista extensa de {skills_count} competências: pode ocupar demasiado espaço na folha A4.")
            tips.append("Priorize as 12 a 18 competências mais relevantes para a função alvo para manter o CV conciso e focado.")
        else:
            tips.append("Adicione competências técnicas específicas e ferramentas alinhadas com as vagas alvo (ideal: 8 a 20).")

        total_score += skills_score

        # 5. ATS Layout & Formatting Safety (max 18 pts)
        layout_score = 0
        is_linear_layout = template.layout in ("classic_ats", "compact_executive", "tech_minimal")
        if template.layout == "classic_ats":
            layout_score += 9
            strengths.append("Layout ATS Clássico (1 coluna linear): 100% legível por todos os parsers ATS corporativos.")
        elif template.layout in ("compact_executive", "tech_minimal"):
            layout_score += 7
        else:  # modern_split
            layout_score += 4
            warnings.append("Layout de 2 colunas: sistemas ATS legados (como Workday antigo ou Taleo) podem ler colunas fora de ordem.")
            tips.append("Para multinacionais com portais corporativos complexos, prefira o modelo 'ATS Clássico'.")

        checklist.append(ATSAuditCheckItem(
            id="layout_safety",
            label="Compatibilidade do Layout",
            passed=is_linear_layout,
            importance="high",
            message="Layout de coluna única linear recomendado para máxima precisão de leitura." if is_linear_layout else "Layout de duas colunas: confirme a ordem de leitura antes de submeter."
        ))

        # Photo check
        if template.has_photo:
            layout_score += 2
            warnings.append("Fotografia ativada: ATS em mercados anglo-saxónicos (EUA, UK, Canadá) costumam rejeitar CVs com foto devido a diretrizes anti-discriminação (EEOC).")
            tips.append("Para candidaturas internacionais aos EUA ou Reino Unido, desative a fotografia no separador Foto.")
            checklist.append(ATSAuditCheckItem(
                id="photo_check",
                label="Fotografia no CV (Impacto ATS)",
                passed=False,
                importance="medium",
                message="Foto presente. Aceite em Portugal/Europa, mas desaconselhado para mercados anglo-saxónicos."
            ))
        else:
            layout_score += 9
            strengths.append("Sem fotografia: máxima conformidade com padrões internacionais de recrutamento cego.")
            checklist.append(ATSAuditCheckItem(
                id="photo_check",
                label="Fotografia no CV (Impacto ATS)",
                passed=True,
                importance="medium",
                message="Sem fotografia (recomendado para ATS internacional)."
            ))

        total_score += layout_score

        # 6. Font & Readability Check (max 8 pts)
        font_clean = (template.font_family or "inter").strip().lower()
        heading_clean = (template.font_heading or template.font_family or "inter").strip().lower()
        font_is_safe = font_clean in cls.SAFE_ATS_FONTS and heading_clean in cls.SAFE_ATS_FONTS
        font_scale = template.font_size_scale or "normal"
        scale_ok = font_scale in ("compact", "normal")

        font_score = (6 if font_is_safe else 2) + (2 if scale_ok else 1)
        total_score += font_score

        checklist.append(ATSAuditCheckItem(
            id="font_safety",
            label="Tipografia & Legibilidade A4",
            passed=font_is_safe,
            importance="medium",
            message=(
                f"Fonte '{template.font_family}' segura para OCR e parsers PDF."
                if font_is_safe
                else f"A fonte '{template.font_family}' não faz parte da lista padrão ATS (prefira Inter, Roboto ou DM Sans)."
            )
        ))

        if font_is_safe:
            strengths.append(f"Tipografia '{template.font_family}': legibilidade elevada e compatível com motores de OCR de PDFs.")
        else:
            warnings.append(f"Tipografia '{template.font_family}' fora do padrão recomendado para ATS.")
            tips.append("Altere a fonte do corpo para Inter, Roboto, DM Sans ou Open Sans para garantir extração fiel de caracteres.")

        # Cap score at 100
        final_score = min(100, max(0, total_score))

        if final_score >= 85:
            status = "excellent"
            summary = "Excelente conformidade ATS. O seu CV está otimizado para passar pelos filtros automáticos com alta classificação."
        elif final_score >= 70:
            status = "good"
            summary = "Boa pontuação ATS. O seu CV é legível, mas algumas melhorias em métricas ou formato podem aumentar as suas hipóteses."
        else:
            status = "needs_improvement"
            summary = "O CV apresenta pontos críticos que podem provocar rejeição automática em sistemas ATS tradicionais. Reveja os avisos abaixo."

        return ATSAuditResponse(
            score=final_score,
            status=status,
            summary=summary,
            checklist=checklist,
            strengths=strengths,
            warnings=warnings,
            actionable_tips=tips
        )
