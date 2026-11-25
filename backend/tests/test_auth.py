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
