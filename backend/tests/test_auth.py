import pytest
import os
import io
import zipfile
import shutil
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db
from backend.app.firebase import firebase_manager

@pytest.fixture(autouse=True)
def clean_test_env():
    # Reset local data for predictable test runs
    firebase_manager._local_data = {
        "users": {},
        "user_data": {}
    }
    firebase_manager._save_local_store()
    yield

@pytest.mark.asyncio
async def test_auth_and_multi_tenant_isolation():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User A
        reg_a = await client.post("/api/auth/register", json={
            "full_name": "André Dias",
            "email": "andre.teste@ubi.pt",
            "password": "Password123!"
        })
        assert reg_a.status_code == 200
        data_a = reg_a.json()
        token_a = data_a["access_token"]
        user_a = data_a["user"]
        assert user_a["email"] == "andre.teste@ubi.pt"
        assert user_a["has_completed_onboarding"] is False

        # 2. Login User A
        login_a = await client.post("/api/auth/login", json={
            "email": "andre.teste@ubi.pt",
            "password": "Password123!"
        })
        assert login_a.status_code == 200
        assert "access_token" in login_a.json()

        # 3. Wrong Password
        login_fail = await client.post("/api/auth/login", json={
            "email": "andre.teste@ubi.pt",
            "password": "WrongPassword!"
        })
        assert login_fail.status_code == 401

        # 4. Register User B (Brand new user)
        reg_b = await client.post("/api/auth/register", json={
            "full_name": "Utilizador Dois",
            "email": "outro.user@ubi.pt",
            "password": "SecretPassword!"
        })
        assert reg_b.status_code == 200
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 5. Verify Multi-Tenant Data Isolation: User B has 0 jobs and clean profile!
        jobs_b = await client.get("/api/jobs", headers=headers_b)
        assert jobs_b.status_code == 200
        assert len(jobs_b.json()) == 0

        stats_b = await client.get("/api/applications/stats", headers=headers_b)
        assert stats_b.status_code == 200
        assert stats_b.json()["total_jobs"] == 0

        prof_b = await client.get("/api/profile", headers=headers_b)
        assert prof_b.status_code == 200
        assert prof_b.json()["full_name"] == "Utilizador Dois"
        assert prof_b.json()["email"] == "outro.user@ubi.pt"
        assert len(prof_b.json()["experiences"]) == 0

@pytest.mark.asyncio
async def test_onboarding_upload_full_zip():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User
        reg = await client.post("/api/auth/register", json={
            "full_name": "User Zip",
            "email": "user.zip@email.com",
            "password": "Password123!"
        })
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Build in-memory ZIP archive of Career-Ops
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w") as z:
            z.writestr("cv.md", "# CV Mestre de Teste ZIP\nExperiência em Python.")
            z.writestr("config/profile.yml", "candidate:\n  full_name: 'User Zip'\n  email: 'user.zip@email.com'\n")
            z.writestr(
                "data/applications.md",
                "| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes | URL |\n"
                "| 1 | 2026-11-06 | Tech Co | — | Full Stack Dev | 4.8/5 | active | [x] | — | Teste nota | [link](https://net-empregos.com/123) |\n"
            )
            z.writestr("output/cv-user-001-tech-co.pdf", b"%PDF-1.4 mock pdf data")

        zip_bytes = zip_buf.getvalue()

        # 3. Upload to /api/auth/onboarding/upload-zip
        files = {"zip_file": ("career_ops.zip", zip_bytes, "application/zip")}
        res = await client.post("/api/auth/onboarding/upload-zip", headers=headers, files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["jobs_count"] == 1
        assert data["cv_base_loaded"] is True

        # 4. Check user jobs
        jobs_res = await client.get("/api/jobs", headers=headers)
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) == 1
        assert jobs[0]["title"] == "Full Stack Dev"

@pytest.mark.asyncio
async def test_onboarding_upload_privacy_mode():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User
        reg = await client.post("/api/auth/register", json={
            "full_name": "User Privacy",
            "email": "user.privacy@email.com",
            "password": "Password123!"
        })
        token = reg.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Build in-memory ZIP containing ONLY output PDFs
        output_zip_buf = io.BytesIO()
        with zipfile.ZipFile(output_zip_buf, "w") as z:
            z.writestr("cv-priv-001-dev.pdf", b"%PDF-1.4 mock pdf")
        output_zip_bytes = output_zip_buf.getvalue()

        # 3. Upload individual files (Modo de Privacidade)
        files = {
            "cv_file": ("cv.md", b"# CV Privado\nEngenheiro de Software.", "text/markdown"),
            "profile_file": ("profile.yml", b"candidate:\n  full_name: 'User Privacy'\n", "text/yaml"),
            "applications_file": (
                "applications.md",
                b"| # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes | URL |\n"
                b"| 1 | 2026-11-06 | Privacy Corp | \xe2\x80\x94 | Lead Dev | 5.0/5 | active | [x] | \xe2\x80\x94 | Privado nota | [link](https://net-empregos.com/999) |\n",
                "text/markdown"
            ),
            "output_zip": ("output.zip", output_zip_bytes, "application/zip")
        }

        res = await client.post("/api/auth/onboarding/upload-privacy", headers=headers, files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["jobs_count"] == 1
        assert data["cv_base_loaded"] is True

        # 4. Check user profile & jobs
        prof_res = await client.get("/api/profile", headers=headers)
        assert prof_res.status_code == 200
        assert prof_res.json()["full_name"] == "User Privacy"

        jobs_res = await client.get("/api/jobs", headers=headers)
        assert jobs_res.status_code == 200
        jobs = jobs_res.json()
        assert len(jobs) == 1
        assert jobs[0]["company"] == "Privacy Corp"


@pytest.mark.asyncio
async def test_user_preferred_language_persistence():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register choosing Korean
        reg = await client.post("/api/auth/register", json={
            "full_name": "Minjun Kim",
            "email": "minjun@example.com",
            "password": "Password123!",
            "preferred_language": "ko"
        })
        assert reg.status_code == 200
        reg_data = reg.json()
        assert reg_data["user"]["preferred_language"] == "ko"
        token = reg_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Login returns the persisted preferred language
        login_res = await client.post("/api/auth/login", json={
            "email": "minjun@example.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["preferred_language"] == "ko"

        # Update preferred language to Arabic
        patch_res = await client.patch(
            "/api/auth/me/language",
            headers=headers,
            json={"preferred_language": "ar"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["preferred_language"] == "ar"

        me_res = await client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["preferred_language"] == "ar"

        # Invalid language rejected
        invalid_res = await client.patch(
            "/api/auth/me/language",
            headers=headers,
            json={"preferred_language": "fr"}
        )
        assert invalid_res.status_code == 422


@pytest.mark.asyncio
async def test_onboarding_parse_cv_and_confirm():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Maria Silva",
            "email": "maria@example.com",
            "password": "Password123!",
            "preferred_language": "en"
        })
        assert reg.status_code == 200
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        sample_cv_txt = (
            b"Maria Silva\n"
            b"Senior Backend Engineer\n"
            b"maria@example.com | +351 912 345 678 | https://github.com/mariasilva\n\n"
            b"Summary\n"
            b"Backend engineer with 6 years building FastAPI services.\n\n"
            b"Skills\n"
            b"Python, FastAPI, PostgreSQL, Docker\n\n"
            b"Experience\n"
            b"Senior Backend Engineer - TechCo (2022 - Present)\n"
            b"- Reduced API latency by 45% in production\n\n"
            b"Education\n"
            b"BSc Computer Science - University of Lisbon (2015 - 2019)\n\n"
            b"Languages\n"
            b"Portuguese: Native, English: C1\n"
        )
        parse_res = await client.post(
            "/api/auth/onboarding/parse-cv",
            headers=headers,
            files={"cv_file": ("resume.txt", sample_cv_txt, "text/plain")},
        )
        assert parse_res.status_code == 200
        parsed = parse_res.json()
        assert "# Maria Silva" in parsed["cv_markdown"]
        assert "Python" in parsed["profile"]["skills"]
        assert parsed["profile"]["github_url"] == "https://github.com/mariasilva"
        assert len(parsed["profile"]["experiences"]) >= 1
        assert len(parsed["profile"]["educations"]) >= 1

        # Onboarding should still be False until user confirms
        me_before = await client.get("/api/auth/me", headers=headers)
        assert me_before.json()["has_completed_onboarding"] is False

        # Confirm extracted profile + converted markdown
        confirm_res = await client.post(
            "/api/auth/onboarding/manual",
            headers=headers,
            json={
                "full_name": parsed["profile"]["full_name"],
                "headline": parsed["profile"]["headline"],
                "email": parsed["profile"]["email"],
                "phone": parsed["profile"]["phone"],
                "location": "Lisboa",
                "github_url": parsed["profile"]["github_url"],
                "summary": parsed["profile"]["summary"],
                "initial_skills": parsed["profile"]["skills"],
                "experiences": parsed["profile"]["experiences"],
                "educations": parsed["profile"]["educations"],
                "languages": parsed["profile"]["languages"],
                "verified_facts": parsed["profile"]["verified_facts"],
                "initial_cv_text": parsed["cv_markdown"],
            },
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["cv_base_loaded"] is True

        me_after = await client.get("/api/auth/me", headers=headers)
        assert me_after.json()["has_completed_onboarding"] is True

        prof = await client.get("/api/profile", headers=headers)
        assert prof.status_code == 200
        assert "FastAPI" in prof.json()["skills"]
        assert prof.json()["github_url"] == "https://github.com/mariasilva"


@pytest.mark.asyncio
async def test_europass_cv_parsing_date_location_and_habilitacoes():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Andy Dias",
            "email": "andy.europass@example.com",
            "password": "Password123!",
            "preferred_language": "pt"
        })
        assert reg.status_code == 200
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        europass_txt = (
            "Andy\u00a0Dias\n"
            "Engenheiro Informático\n"
            "EXPERIÊNCIA PROFISSIONAL\n"
            "10/09/2025 - 10/09/2026 - COVILHÃ, PORTUGAL\n"
            "Diretor de Tecnologia e Comunicação - Associação Académica\n"
            "• Coordenação e gestão direta da equipa criativa\n"
            "• Supervisão do calendário editorial para os meios de media\n"
            "online, garantindo o cumprimento rigoroso de prazos\n"
            "HABILITAÇÕES E FORMAÇÃO\n"
            "15/09/2020 - 30/06/2024 - COVILHÃ, PORTUGAL\n"
            "Licenciatura em Engenharia Informática\n"
            "Universidade da Beira Interior\n"
        ).encode("utf-8")

        res = await client.post(
            "/api/auth/onboarding/parse-cv",
            headers=headers,
            files={"cv_file": ("europass.txt", europass_txt, "text/plain")},
        )
        assert res.status_code == 200
        prof = res.json()["profile"]
        assert len(prof["experiences"]) == 1
        exp = prof["experiences"][0]
        assert exp["role"] == "Diretor de Tecnologia e Comunicação"
        assert exp["company"] == "Associação Académica"
        assert exp["period"] == "10/09/2025 - 10/09/2026"
        assert exp["location"] == "COVILHÃ, PORTUGAL"
        assert len(exp["bullets"]) == 2
        assert "meios de media online, garantindo" in exp["bullets"][1]

        assert len(prof["educations"]) == 1
        edu = prof["educations"][0]
        assert edu["degree"] == "Licenciatura em Engenharia Informática"
        assert edu["institution"] == "Universidade da Beira Interior"
        assert edu["period"] == "15/09/2020 - 30/06/2024"


def _build_minimal_pdf(page_streams: list[str]) -> bytes:
    """Build a valid multi-page PDF 1.4 document from raw PDF content streams."""
    objects: list[bytes] = []
    # 1: Catalog, 2: Pages, 3: Helvetica regular, 4: Helvetica-Bold
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

    page_obj_nums = []
    next_id = 5
    page_objs: list[bytes] = []
    content_objs: list[bytes] = []
    for stream_text in page_streams:
        p_id = next_id
        c_id = next_id + 1
        next_id += 2
        page_obj_nums.append(p_id)
        stream_bytes = stream_text.encode("latin-1", errors="replace")
        page_objs.append(
            f"{p_id} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {c_id} 0 R >>\nendobj\n".encode("ascii")
        )
        content_objs.append(
            f"{c_id} 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("ascii")
            + stream_bytes
            + b"\nendstream\nendobj\n"
        )

    kids = " ".join(f"{n} 0 R" for n in page_obj_nums)
    objects.append(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(page_obj_nums)} >>\nendobj\n".encode("ascii"))
    objects.append(b"3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n")
    objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n")
    for p_obj, c_obj in zip(page_objs, content_objs):
        objects.append(p_obj)
        objects.append(c_obj)

    buf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(buf))
        buf.extend(obj)
    xref_pos = len(buf)
    buf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        buf.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    buf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii"))
    return bytes(buf)


def _pdf_text_cmd(x: int, y: int, text: str, font: str = "F1", size: int = 10) -> str:
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({escaped}) Tj ET\n"


@pytest.mark.asyncio
async def test_pdf_two_column_spatial_extraction_and_markdown_conversion():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Andy Dias",
            "email": "andy.pdf@example.com",
            "password": "Password123!",
            "preferred_language": "pt",
        })
        assert reg.status_code == 200
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Page 1: Full-width name banner + Two-column sidebar (left x=40, right x=230) + repeated footer
        p1 = "".join([
            _pdf_text_cmd(40, 800, "Curriculum Vitae", "F1", 9),
            _pdf_text_cmd(40, 770, "Andy Dias", "F2", 18),
            _pdf_text_cmd(40, 750, "Engenheiro de Software", "F1", 11),
            # Left sidebar column (Contact + Skills + Languages)
            _pdf_text_cmd(40, 700, "Contactos", "F2", 11),
            _pdf_text_cmd(40, 682, "andy.dias@example.com", "F1", 9),
            _pdf_text_cmd(40, 666, "+351 912 345 678", "F1", 9),
            _pdf_text_cmd(40, 650, "Covilha, Portugal", "F1", 9),
            _pdf_text_cmd(40, 615, "Competencias Tecnicas", "F2", 11),
            _pdf_text_cmd(40, 595, "Python, FastAPI, React", "F1", 9),
            _pdf_text_cmd(40, 578, "Docker, TypeScript", "F1", 9),
            _pdf_text_cmd(40, 540, "Idiomas", "F2", 11),
            _pdf_text_cmd(40, 522, "Portugues: Nativo", "F1", 9),
            _pdf_text_cmd(40, 506, "Ingles: C1", "F1", 9),
            # Right main column (Experience with wrapped bullet + metadata)
            _pdf_text_cmd(230, 700, "E X P E R I E N C I A   P R O F I S S I O N A L", "F2", 11),
            _pdf_text_cmd(230, 678, "10/09/2025 - 10/09/2026 - Covilha, Portugal", "F1", 9),
            _pdf_text_cmd(230, 660, "Diretor de Tecnologia", "F2", 10),
            _pdf_text_cmd(230, 645, "Associacao Academica", "F1", 10),
            _pdf_text_cmd(230, 630, "Cidade: Covilha | Pais: Portugal", "F1", 9),
            _pdf_text_cmd(230, 612, "\x95 Coordenacao direta da equipa criativa com desen-", "F1", 9),
            _pdf_text_cmd(230, 598, "volvimento de plataformas web modernas.", "F1", 9),
            _pdf_text_cmd(230, 580, "\x95 Supervisao do calendario editorial para os", "F1", 9),
            _pdf_text_cmd(230, 566, "meios online, aumentando em 35% o alcance.", "F1", 9),
            _pdf_text_cmd(40, 35, "Pagina 1 / 2", "F1", 8),
        ])
        # Page 2: Education + repeated footer
        p2 = "".join([
            _pdf_text_cmd(40, 800, "Curriculum Vitae", "F1", 9),
            _pdf_text_cmd(40, 750, "Habilitacoes e Formacao", "F2", 12),
            _pdf_text_cmd(40, 728, "15/09/2020 - 30/06/2024 - Covilha, Portugal", "F1", 9),
            _pdf_text_cmd(40, 710, "Licenciatura em Engenharia Informatica", "F2", 10),
            _pdf_text_cmd(40, 694, "Universidade da Beira Interior", "F1", 10),
            _pdf_text_cmd(40, 678, "Localidade: Covilha | Classificacao final: 17/20", "F1", 9),
            _pdf_text_cmd(40, 35, "Pagina 2 / 2", "F1", 8),
        ])

        pdf_bytes = _build_minimal_pdf([p1, p2])
        res = await client.post(
            "/api/auth/onboarding/parse-cv",
            headers=headers,
            files={"cv_file": ("curriculo.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 200
        body = res.json()
        md = body["cv_markdown"]
        prof = body["profile"]

        # Boilerplate stripped, name & section headers intact
        assert "Curriculum Vitae" not in md
        assert "Pagina 1 / 2" not in md
        assert "# Andy Dias" in md
        assert prof["full_name"] == "Andy Dias"
        assert prof["email"] == "andy.dias@example.com"
        assert "+351 912 345 678" in prof["phone"]
        assert "Python" in prof["skills"] and "TypeScript" in prof["skills"]

        # Dehyphenated and unwrapped bullets without column mixing
        assert len(prof["experiences"]) == 1
        exp = prof["experiences"][0]
        assert exp["role"] == "Diretor de Tecnologia"
        assert exp["company"] == "Associacao Academica"
        assert exp["period"] == "10/09/2025 - 10/09/2026"
        assert exp["location"] == "Covilha, Portugal"
        assert len(exp["bullets"]) == 2
        assert "desenvolvimento de plataformas web modernas." in exp["bullets"][0]
        assert "meios online, aumentando em 35% o alcance." in exp["bullets"][1]

        # Education extracted cleanly without metadata lines turning into fake rows
        assert len(prof["educations"]) == 1
        edu = prof["educations"][0]
        assert edu["degree"] == "Licenciatura em Engenharia Informatica"
        assert edu["institution"] == "Universidade da Beira Interior"
        assert edu["period"] == "15/09/2020 - 30/06/2024"


@pytest.mark.asyncio
async def test_pdf_classic_europass_timeline_table_layout():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Joana Pereira",
            "email": "joana.timeline@example.com",
            "password": "Password123!",
            "preferred_language": "pt",
        })
        assert reg.status_code == 200
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Classic Europass timeline table: left column has section labels & date ranges, right column has roles/bullets/degrees
        p1 = "".join([
            _pdf_text_cmd(40, 790, "Joana Pereira", "F2", 16),
            _pdf_text_cmd(40, 772, "joana.timeline@example.com", "F1", 9),
            _pdf_text_cmd(40, 730, "Experiencia Profissional", "F2", 11),
            _pdf_text_cmd(40, 710, "10/09/2025 - 10/09/2026", "F1", 9),
            _pdf_text_cmd(200, 710, "Gestora de Produto - InovaTech", "F2", 10),
            _pdf_text_cmd(200, 692, "\x95 Lideranca de equipa multidisciplinar com 8 pessoas.", "F1", 9),
            _pdf_text_cmd(40, 650, "01/03/2022 - 30/08/2025", "F1", 9),
            _pdf_text_cmd(200, 650, "Analista Funcional - FinCorp", "F2", 10),
            _pdf_text_cmd(200, 632, "\x95 Levantamento de requisitos e testes funcionais.", "F1", 9),
            _pdf_text_cmd(40, 580, "Habilitacoes e Formacao", "F2", 11),
            _pdf_text_cmd(40, 558, "15/09/2018 - 30/06/2021", "F1", 9),
            _pdf_text_cmd(200, 558, "Mestrado em Gestao de Sistemas - Universidade do Porto", "F1", 10),
            _pdf_text_cmd(40, 520, "Competencias Digitais", "F2", 11),
            _pdf_text_cmd(200, 520, "SQL, Jira, Figma, Python", "F1", 9),
        ])

        pdf_bytes = _build_minimal_pdf([p1])
        res = await client.post(
            "/api/auth/onboarding/parse-cv",
            headers=headers,
            files={"cv_file": ("europass_classic.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 200
        prof = res.json()["profile"]

        assert len(prof["experiences"]) == 2
        assert prof["experiences"][0]["role"] == "Gestora de Produto"
        assert prof["experiences"][0]["company"] == "InovaTech"
        assert prof["experiences"][0]["period"] == "10/09/2025 - 10/09/2026"
        assert prof["experiences"][1]["role"] == "Analista Funcional"
        assert prof["experiences"][1]["company"] == "FinCorp"
        assert prof["experiences"][1]["period"] == "01/03/2022 - 30/08/2025"

        assert len(prof["educations"]) == 1
        assert prof["educations"][0]["degree"] == "Mestrado em Gestao de Sistemas"
        assert prof["educations"][0]["institution"] == "Universidade do Porto"
        assert prof["educations"][0]["period"] == "15/09/2018 - 30/06/2021"
        assert "SQL" in prof["skills"] and "Figma" in prof["skills"]
