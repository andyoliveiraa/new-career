import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.ats_auditor import ATSAuditorService
from backend.app.services.pdf_generator import PDFGeneratorService
from backend.app.schemas.cv_template import CVTemplateBase

@pytest.mark.asyncio
async def test_cv_templates_crud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register test user
        register_res = await ac.post("/api/auth/register", json={
            "email": "template_user@example.com",
            "password": "password123",
            "full_name": "Template Tester"
        })
        assert register_res.status_code == 200
        token = register_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. List templates -> Should auto-seed default templates
        list_res = await ac.get("/api/cv-templates", headers=headers)
        assert list_res.status_code == 200
        templates = list_res.json()
        assert len(templates) >= 4
        assert any(t["layout"] == "classic_ats" for t in templates)

        # 2. Create custom template with Google Font and custom color
        custom_payload = {
            "name": "Design Minimalista Custom",
            "layout": "modern_split",
            "has_photo": True,
            "photo_url": "https://example.com/photo.jpg",
            "accent_color": "#0ea5e9",
            "font_family": "Plus Jakarta Sans",
            "font_heading": "Outfit",
            "font_size_scale": "normal",
            "blocks_order": ["summary", "skills", "experiences", "educations"],
            "block_visibility": {
                "summary": True,
                "skills": True,
                "experiences": True,
                "educations": True,
                "certifications": False,
                "projects": False,
                "languages": False
            },
            "is_default": False
        }
        create_res = await ac.post("/api/cv-templates", json=custom_payload, headers=headers)
        assert create_res.status_code == 200
        created = create_res.json()
        assert created["name"] == "Design Minimalista Custom"
        assert created["accent_color"] == "#0ea5e9"
        assert created["font_family"] == "Plus Jakarta Sans"
        template_id = created["id"]

        # 3. Get template by ID
        get_res = await ac.get(f"/api/cv-templates/{template_id}", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == template_id

        # 4. Update template
        update_res = await ac.put(f"/api/cv-templates/{template_id}", json={
            "accent_color": "#10b981",
            "name": "Design Atualizado"
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["accent_color"] == "#10b981"
        assert update_res.json()["name"] == "Design Atualizado"

        # 5. Delete template
        del_res = await ac.delete(f"/api/cv-templates/{template_id}", headers=headers)
        assert del_res.status_code == 200

        # Verify deletion
        get_after_del = await ac.get(f"/api/cv-templates/{template_id}", headers=headers)
        assert get_after_del.status_code == 404

def test_ats_auditor_scoring():
    template = CVTemplateBase(
        name="ATS Test",
        layout="classic_ats",
        has_photo=False,
        accent_color="#1e293b",
        font_family="Inter",
        blocks_order=["summary", "skills", "experiences", "educations"],
        block_visibility={"summary": True, "skills": True, "experiences": True, "educations": True}
    )

    profile_complete = {
        "full_name": "João Silva",
        "email": "joao.silva@example.com",
        "phone": "+351 912 345 678",
        "location": "Porto, Portugal",
        "linkedin_url": "linkedin.com/in/joaosilva",
        "summary": "Engenheiro de Software com experiência comprovada em sistemas escaláveis e cloud.",
        "skills": ["Python", "FastAPI", "React", "Docker", "PostgreSQL", "AWS", "Git", "TypeScript", "Redis", "Linux"],
        "experiences": [
            {
                "role": "Senior Engineer",
                "company": "Empresa XPTO",
                "bullets": [
                    "Otimizou o tempo de resposta das APIs em 45%, reduzindo custos de servidor em $12k.",
                    "Liderou equipa de 5 desenvolvedores na entrega de 12 microsserviços.",
                    "Automatizou pipelines de integração contínua."
                ]
            }
        ],
        "educations": [
            {
                "degree": "Licenciatura em Informática",
                "institution": "Universidade do Porto"
            }
        ]
    }

    audit = ATSAuditorService.audit(template, profile_complete)
    assert audit.score >= 85
    assert audit.status == "excellent"
    assert len(audit.strengths) > 0
    assert any("45%" in str(b) or "métricas" in s.lower() for s in audit.strengths for b in profile_complete["experiences"][0]["bullets"])

    # Photo and missing contact penalty check
    template_photo = CVTemplateBase(
        name="Photo Test",
        layout="modern_split",
        has_photo=True,
        accent_color="#2563eb",
        font_family="Comic Sans",
        blocks_order=["summary", "skills"],
        block_visibility={"summary": True, "skills": True, "experiences": False}
    )
    profile_incomplete = {
        "full_name": "Sem Email",
        "skills": ["Python"]
    }
    audit_bad = ATSAuditorService.audit(template_photo, profile_incomplete)
    assert audit_bad.score < 60
    assert audit_bad.status == "needs_improvement"
    assert any("fotografia" in w.lower() or "foto" in w.lower() for w in audit_bad.warnings)

def test_pdf_generator_html_rendering():
    profile = {
        "full_name": "Maria Santos",
        "headline": "Lead Data Scientist",
        "email": "maria@example.com",
        "phone": "+351 961 111 222",
        "location": "Coimbra, Portugal",
        "summary": "Especialista em Machine Learning e Big Data.",
        "skills": ["Python", "PyTorch", "SQL", "Pandas"],
        "experiences": [
            {
                "role": "Lead Data Scientist",
                "company": "DataCorp",
                "period": "2021 - Presente",
                "bullets": ["Desenvolveu modelo de churn com 92% de precisão."]
            }
        ]
    }

    template_cfg = {
        "layout": "modern_split",
        "accent_color": "#7c3aed",
        "font_family": "Plus Jakarta Sans",
        "font_heading": "Outfit",
        "has_photo": True,
        "photo_url": "https://example.com/avatar.png",
        "blocks_order": ["summary", "skills", "experiences"],
        "block_visibility": {"summary": True, "skills": True, "experiences": True}
    }

    html = PDFGeneratorService.render_html(
        profile_dict=profile,
        template_config=template_cfg
    )

    assert "Maria Santos" in html
    assert "Plus+Jakarta+Sans" in html
    assert "#7c3aed" in html
    assert "https://example.com/avatar.png" in html
    assert "cv-modern-split" in html
    assert "<!--email_off-->" in html
    assert "width: 210mm;" in html


def test_ats_auditor_portuguese_nominal_verbs_and_skills_cap():
    template = CVTemplateBase(
        name="ATS PT",
        layout="classic_ats",
        has_photo=False,
        accent_color="#2563eb",
        font_family="Inter",
    )
    profile = {
        "full_name": "André Dias",
        "email": "andre@example.com",
        "phone": "+351 965 398 851",
        "location": "Portugal",
        "summary": "Profissional polivalente com experiência em gestão operacional, equipas e atendimento ao cliente.",
        "skills": [f"Skill {i}" for i in range(30)],
        "experiences": [
            {
                "role": "Diretor",
                "company": "Associação",
                "bullets": [
                    "Coordenação e gestão direta da equipa criativa de 8 pessoas.",
                    "Implementação de melhorias e monitorização de performance com 25% mais tráfego.",
                    "Administração técnica do website e planeamento estratégico anual.",
                ],
            }
        ],
        "educations": [{"degree": "Técnico", "institution": "Escola"}],
    }
    audit = ATSAuditorService.audit(template, profile)
    metrics_item = next(c for c in audit.checklist if c.id == "metrics_verbs")
    skills_item = next(c for c in audit.checklist if c.id == "skills_density")
    font_item = next(c for c in audit.checklist if c.id == "font_safety")
    assert metrics_item.passed is True
    assert skills_item.passed is False
    assert font_item.passed is True
    assert any("LinkedIn" in tip for tip in audit.actionable_tips)
