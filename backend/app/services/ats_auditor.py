import re
from typing import Dict, Any, List, Optional
from backend.app.schemas.cv_template import ATSAuditResponse, ATSAuditCheckItem, CVTemplateBase

class ATSAuditorService:
    METRIC_PATTERNS = [
        r'\b\d+%',                          # 35%, 100%
        r'[\$€£]\s*\d+',                     # $50k, €10000
        r'\b\d+\s*k\b',                      # 50k
        r'\b\d+\s*(usuários|users|clientes|clients|membros|anos|years|projetos|projects|sprints|ms|horas|hours)\b',
        r'\b(reduziu|aumentou|melhorou|otimizou|cresceu|reduced|increased|improved|optimized|boosted)\b.*\b\d+\b',
        r'\b\d+\b'                          # any explicit number
    ]

    ACTION_VERBS = {
        "pt": [
            "desenvolveu", "implementou", "liderou", "otimizou", "reduziu", "aumentou",
            "criou", "geriu", "coordenou", "concebeu", "automatizou", "reestruturou",
            "integrou", "acelerou", "construiu", "arquitetou", "alcançou", "superou",
            "desenvolver", "implementar", "liderar", "otimizar", "criar", "coordenar"
        ],
        "en": [
            "developed", "implemented", "led", "optimized", "reduced", "increased",
            "created", "managed", "coordinated", "designed", "automated", "restructured",
            "integrated", "accelerated", "built", "architected", "achieved", "delivered",
            "spearheaded", "engineered", "scaled"
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

        # 1. Contact Information Checks (max 20 pts)
        has_email = bool(profile.get("email") and "@" in profile.get("email", ""))
        has_phone = bool(profile.get("phone"))
        has_location = bool(profile.get("location"))
        has_links = bool(profile.get("linkedin_url") or profile.get("github_url") or profile.get("portfolio_url"))

        contact_score = 0
        if has_email:
            contact_score += 6
        if has_phone:
            contact_score += 5
        if has_location:
            contact_score += 5
        if has_links:
            contact_score += 4

        checklist.append(ATSAuditCheckItem(
            id="contact_info",
            label="Dados de Contacto Essenciais",
            passed=(contact_score >= 16),
            importance="high",
            message=f"Email ({'✓' if has_email else '✗'}), Telefone ({'✓' if has_phone else '✗'}), Localização ({'✓' if has_location else '✗'}), Links ({'✓' if has_links else '✗'})."
        ))

        if contact_score >= 16:
            strengths.append("Informação de contacto completa e fácil de extrair pelos sistemas ATS.")
        else:
            if not has_email:
                warnings.append("Falta o endereço de email no perfil: o sistema ATS não conseguirá indexar a candidatura.")
            if not has_phone:
                tips.append("Adicione um número de telefone com indicativo internacional (+351...) para facilitar o contacto de recrutadores.")
            if not has_location:
                tips.append("Indique a sua cidade e país (ex: 'Lisboa, Portugal') para coincidir com filtros geográficos de vagas.")

        total_score += contact_score

        # 2. Section Visibility & Presence (max 20 pts)
        vis = template.block_visibility or {}
        has_summary = vis.get("summary", True) and bool(profile.get("summary"))
        has_exp = vis.get("experiences", True) and bool(profile.get("experiences"))
        has_edu = vis.get("educations", True) and bool(profile.get("educations"))
        has_skills = vis.get("skills", True) and bool(profile.get("skills"))

        section_score = 0
        if has_exp:
            section_score += 8
        if has_skills:
            section_score += 5
        if has_edu:
            section_score += 4
        if has_summary:
            section_score += 3

        checklist.append(ATSAuditCheckItem(
            id="core_sections",
            label="Secções Obrigatórias do CV",
            passed=(section_score >= 17),
            importance="high",
            message=f"Experiência ({'✓' if has_exp else '✗'}), Competências ({'✓' if has_skills else '✗'}), Formação ({'✓' if has_edu else '✗'}), Resumo ({'✓' if has_summary else '✗'})."
        ))

        if section_score >= 17:
            strengths.append("Estrutura padrão de secções reconhecida pelos motores de parsing de RH.")
        else:
            if not has_exp:
                warnings.append("Nenhuma experiência profissional visível. Esta é a secção com maior peso no rastreio.")
            if not has_skills:
                warnings.append("Secção de competências técnicas desativada ou vazia. Reduz significativamente a correspondência de palavras-chave.")

        total_score += section_score

        # 3. Action Verbs & Quantifiable Metrics (max 25 pts)
        experiences = profile.get("experiences", [])
        all_bullet_texts = []
        for exp in experiences:
            bullets = exp.get("bullets", [])
            for b in bullets:
                if isinstance(b, str):
                    all_bullet_texts.append(b)

        combined_text = " ".join(all_bullet_texts).lower()

        # Check metrics
        metric_matches = 0
        for pattern in cls.METRIC_PATTERNS:
            matches = re.findall(pattern, combined_text, flags=re.IGNORECASE)
            metric_matches += len(matches)

        # Check action verbs
        verb_matches = 0
        for v in cls.ACTION_VERBS["pt"] + cls.ACTION_VERBS["en"]:
            if re.search(r'\b' + re.escape(v) + r'\b', combined_text, flags=re.IGNORECASE):
                verb_matches += 1

        metrics_score = 0
        if metric_matches >= 3:
            metrics_score += 15
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

        metrics_passed = (metrics_score >= 18)
        checklist.append(ATSAuditCheckItem(
            id="metrics_verbs",
            label="Métricas de Impacto e Verbos de Ação",
            passed=metrics_passed,
            importance="high",
            message=f"Encontradas {metric_matches} métricas quantificáveis e {verb_matches} verbos de ação assertivos."
        ))

        if metrics_passed:
            strengths.append(f"Forte orientação a resultados: foram identificadas {metric_matches} métricas e dados de impacto.")
        else:
            warnings.append("Poucas métricas quantitativas identificadas nos pontos de experiência.")
            tips.append("Adicione números e percentagens concretos aos seus bullets (ex: 'Otimizou o tempo de carregamento em 40%', 'Liderou equipa de 5 engenheiros').")

        total_score += metrics_score

        # 4. Skills Categorization & Density (max 15 pts)
        skills = profile.get("skills", [])
        skills_count = len(skills)
        skills_score = 0
        if skills_count >= 10:
            skills_score = 15
        elif skills_count >= 6:
            skills_score = 11
        elif skills_count >= 3:
            skills_score = 6
        else:
            skills_score = 2

        skills_passed = (skills_score >= 11)
        checklist.append(ATSAuditCheckItem(
            id="skills_density",
            label="Densidade de Competências Chave",
            passed=skills_passed,
            importance="medium",
            message=f"O CV contém {skills_count} competências indexáveis (ideal: 8 a 16 competências)."
        ))

        if skills_passed:
            strengths.append(f"Boa densidade de competências técnicas ({skills_count} listadas) para matching semântico.")
        else:
            tips.append("Adicione competências técnicas específicas e ferramentas (ex: Docker, TypeScript, PostgreSQL, AWS) alinhadas com as vagas.")

        total_score += skills_score

        # 5. ATS Layout & Formatting Safety (max 20 pts)
        layout_score = 0
        is_linear_layout = template.layout in ("classic_ats", "compact_executive", "tech_minimal")
        if template.layout == "classic_ats":
            layout_score += 10
            strengths.append("Layout ATS Clássico (1 coluna linear): 100% legível por todos os parsers ATS corporativos.")
        elif template.layout in ("compact_executive", "tech_minimal"):
            layout_score += 8
        else: # modern_split
            layout_score += 5
            warnings.append("Layout de 2 colunas: Sistemas ATS mais antigos (como Workday legados ou Taleo) podem ler colunas horizontalmente.")
            tips.append("Se estiver a concorrer a multinacionais com portais corporativos complexos, prefira o modelo 'ATS Clássico'.")

        checklist.append(ATSAuditCheckItem(
            id="layout_safety",
            label="Compatibilidade do Layout",
            passed=is_linear_layout,
            importance="high",
            message="Layout de coluna única linear recomendado para 100% de precisão de leitura." if is_linear_layout else "Layout em grelha/duas colunas: requer cuidado com a ordem de leitura."
        ))

        # Photo check
        if template.has_photo:
            layout_score += 2
            warnings.append("Fotografia ativada: ATS em mercados anglo-saxónicos (EUA, UK, Canadá) costumam rejeitar CVs com foto devido a diretrizes anti-discriminação (EEOC).")
            tips.append("Para candidaturas internacionais aos EUA ou Reino Unido, desative a fotografia no seletor de blocos.")
            checklist.append(ATSAuditCheckItem(
                id="photo_check",
                label="Fotografia no CV (Impacto ATS)",
                passed=False,
                importance="medium",
                message="Foto presente. Válido em Portugal e Europa, mas desaconselhado para vagas internacionais/EUA."
            ))
        else:
            layout_score += 10
            strengths.append("Sem fotografia: máxima conformidade com padrões internacionais de recrutamento cego.")
            checklist.append(ATSAuditCheckItem(
                id="photo_check",
                label="Fotografia no CV (Impacto ATS)",
                passed=True,
                importance="medium",
                message="Sem fotografia (Recomendado para ATS internacional)."
            ))

        total_score += layout_score

        # 6. Font Check
        font_clean = (template.font_family or "inter").strip().lower()
        if font_clean in cls.SAFE_ATS_FONTS:
            strengths.append(f"Tipografia '{template.font_family}': Excelente legibilidade e compatível com motores de OCR de PDFs.")
        else:
            tips.append(f"A fonte '{template.font_family}' pode ter renderização variável em alguns sistemas de visualização. As fontes recomendadas são Inter, Roboto ou DM Sans.")

        # Cap score at 100
        final_score = min(100, max(0, total_score))

        if final_score >= 85:
            status = "excellent"
            summary = "Excelente conformidade ATS! O seu CV está otimizado para passar pelos filtros automáticos com alta classificação."
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
