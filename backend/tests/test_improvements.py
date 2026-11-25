import io
import json
import os
import zipfile
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from backend.app.firebase import firebase_manager
from backend.app.main import app
from backend.app.schemas.cv_template import CVTemplateBase
from backend.app.security import decrypt_secret, encrypt_secret, is_masked_value
from backend.app.services.ai_tailor import AITailorService
from backend.app.services.career_ops_importer import CareerOpsImporter


@pytest.fixture(autouse=True)
def clean_store():
    firebase_manager._local_data = {"users": {}, "user_data": {}}
    firebase_manager._save_local_store()
    yield
    firebase_manager._local_data = {"users": {}, "user_data": {}}
    firebase_manager._save_local_store()


async def _register_user(client: AsyncClient, email: str, name: str = "Teste User"):
    res = await client.post("/api/auth/register", json={
        "full_name": name,
        "email": email,
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    return data["user"], {"Authorization": f"Bearer {data['access_token']}"}


@pytest.mark.asyncio
async def test_scan_endpoint_accepts_json_body_and_tracks_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers = await _register_user(client, "scan_user@example.com")

        with patch("backend.app.api.scrapers.run_scan_task", new_callable=AsyncMock) as mock_task:
            res = await client.post("/api/scrapers/scan", json={
                "sources": ["netempregos", "ats"],
                "query": "FastAPI Engineer",
                "location": "Porto",
                "limit": 15
            }, headers=headers)
            assert res.status_code == 200
            body = res.json()
            assert body["status"] == "started"
            assert isinstance(body["scan_id"], int)
            assert "FastAPI Engineer" in body["message"]
            assert "Porto" in body["message"]
            mock_task.assert_awaited_once()

            status_res = await client.get(f"/api/scrapers/scan/{body['scan_id']}", headers=headers)
            assert status_res.status_code == 200
            assert status_res.json()["query"] == "FastAPI Engineer"
            assert status_res.json()["location"] == "Porto"

            # Also accept location-only scan without query
            loc_only_res = await client.post("/api/scrapers/scan", json={
                "sources": ["netempregos"],
                "query": "",
                "location": "Lisboa",
                "limit": 10
            }, headers=headers)
            assert loc_only_res.status_code == 200
            assert "Lisboa" in loc_only_res.json()["message"]

            # Reject when both query and location are empty
            empty_res = await client.post("/api/scrapers/scan", json={
                "sources": ["netempregos"],
                "query": "",
                "location": "",
                "limit": 10
            }, headers=headers)
            assert empty_res.status_code == 400


@pytest.mark.asyncio
async def test_career_ops_importer_uses_dynamic_cv_and_profile_data():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers = await _register_user(client, "dynamic_user@example.com", "Joana Almeida")

        cv_md = (
            "# Joana Almeida\n"
            "## Experiência Profissional\n"
            "2022 - Presente - Porto, Portugal\n"
            "## Senior Python Developer — CloudLabs\n"
            "- Desenvolveu APIs assíncronas em FastAPI reduzindo latência em 35%.\n"
            "## Competências\n"
            "- Python, FastAPI, PostgreSQL, Docker\n"
        )
        profile_yml = (
            "candidate:\n"
            "  full_name: 'Joana Almeida'\n"
            "  email: 'dynamic_user@example.com'\n"
            "  location: 'Porto, Portugal'\n"
            "narrative:\n"
            "  headline: 'Backend Architect'\n"
            "  exit_story: 'Especialista em sistemas distribuídos Python.'\n"
        )

        files = {
            "cv_file": ("cv.md", cv_md.encode("utf-8"), "text/markdown"),
            "profile_file": ("profile.yml", profile_yml.encode("utf-8"), "text/yaml"),
        }
        res = await client.post("/api/auth/onboarding/upload-privacy", headers=headers, files=files)
        assert res.status_code == 200
        payload = res.json()
        assert payload["experiences_count"] == 1
        assert payload["skills_count"] >= 4

        prof_res = await client.get("/api/profile", headers=headers)
        assert prof_res.status_code == 200
        prof = prof_res.json()
        assert prof["full_name"] == "Joana Almeida"
        assert prof["experiences"][0]["company"] == "CloudLabs"
        assert "Pans & Company" not in json.dumps(prof)


def test_zip_slip_commonpath_protection(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("../escape/evil.txt", "pwned")
    with pytest.raises(Exception):
        CareerOpsImporter._safe_extract_zip(buf.getvalue(), str(tmp_path / "target"))


@pytest.mark.asyncio
async def test_ai_cascade_fallback_from_gemini_to_groq():
    user_keys = {
        "primary_ai_provider": "gemini",
        "gemini_api_key": encrypt_secret("fake-gemini-key"),
        "groq_api_key": encrypt_secret("fake-groq-key"),
    }

    with patch.object(AITailorService, "_call_gemini", new_callable=AsyncMock, return_value=None) as mock_gem, \
         patch.object(AITailorService, "_call_openai_compatible", new_callable=AsyncMock, return_value='{"ok": true}') as mock_groq:
        res = await AITailorService.call_llm("Teste prompt", provider="gemini", user_keys=user_keys)
        assert res == '{"ok": true}'
        mock_gem.assert_awaited_once()
        mock_groq.assert_awaited_once()


@pytest.mark.asyncio
async def test_settings_encryption_masking_and_preservation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers = await _register_user(client, "sec_settings@example.com")

        put1 = await client.put("/api/settings", json={
            "gemini_api_key": "AIzaSySecretKey1234567890",
            "discord_webhook_url": "https://discord.com/api/webhooks/12345/secret-token"
        }, headers=headers)
        assert put1.status_code == 200
        body1 = put1.json()
        assert body1["gemini_api_key"] is None
        assert body1["discord_webhook_url"] is None
        assert body1["has_gemini_key"] is True
        assert body1["has_discord_webhook"] is True
        assert body1["gemini_api_key_masked"] == "AIza••••7890"
        assert is_masked_value(body1["gemini_api_key_masked"])

        # Updating another setting with masked placeholder must not wipe stored key
        put2 = await client.put("/api/settings", json={
            "primary_ai_provider": "groq",
            "gemini_api_key": body1["gemini_api_key_masked"]
        }, headers=headers)
        assert put2.status_code == 200
        assert put2.json()["has_gemini_key"] is True

        raw_stored = await firebase_manager.get_user_settings(body1["user_id"])
        assert raw_stored["gemini_api_key"].startswith("enc::")
        assert decrypt_secret(raw_stored["gemini_api_key"]) == "AIzaSySecretKey1234567890"


@pytest.mark.asyncio
async def test_manual_job_export_batch_liveness_and_interview_prep():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        _, headers = await _register_user(client, "jobs_flow@example.com")

        # 1. Create manual job
        create_res = await client.post("/api/jobs", json={
            "url": "https://boards.greenhouse.io/acme/jobs/123456",
            "title": "Platform Engineer",
            "company": "Acme Cloud",
            "location": "Remoto",
            "is_remote": True,
            "description": "Python, Docker, Kubernetes"
        }, headers=headers)
        assert create_res.status_code == 200
        job = create_res.json()
        assert job["source"] == "greenhouse"
        assert job["distance_km"] == 0.0

        # 2. Duplicate URL returns existing job without creating duplicate
        dup_res = await client.post("/api/jobs", json={
            "url": "https://boards.greenhouse.io/acme/jobs/123456",
            "title": "Platform Engineer"
        }, headers=headers)
        assert dup_res.status_code == 200
        assert dup_res.json()["id"] == job["id"]

        # 3. Export CSV & JSON
        csv_res = await client.get("/api/jobs/export?format=csv", headers=headers)
        assert csv_res.status_code == 200
        assert "Platform Engineer" in csv_res.text

        json_res = await client.get("/api/jobs/export?format=json", headers=headers)
        assert json_res.status_code == 200
        assert len(json_res.json()) == 1

        # 4. Batch liveness check (mocked)
        with patch("backend.app.api.jobs.LivenessService.check_liveness", new_callable=AsyncMock, return_value={"status": "active", "reason": "OK"}):
            batch_res = await client.post("/api/jobs/check-liveness-batch", json={"job_ids": [job["id"]]}, headers=headers)
            assert batch_res.status_code == 200
            assert batch_res.json()["checked"] == 1
            assert batch_res.json()["active"] == 1

        # 5. Interview prep endpoint
        prep_res = await client.post("/api/ai/interview-prep", json={"job_id": job["id"]}, headers=headers)
        assert prep_res.status_code == 200
        assert len(prep_res.json()["likely_questions"]) >= 2

        # 6. Discord notification on status change to entrevista
        await client.put("/api/settings", json={
            "discord_webhook_url": "https://discord.com/api/webhooks/111222/token-abc",
            "discord_notify_on_status_change": True
        }, headers=headers)
        with patch("backend.app.api.applications.DiscordNotificationService.send_status_change_notification", new_callable=AsyncMock, return_value=True) as mock_notif:
            patch_res = await client.patch(f"/api/applications/{job['id']}", json={"status": "entrevista"}, headers=headers)
            assert patch_res.status_code == 200
            mock_notif.assert_awaited_once()


@pytest.mark.asyncio
async def test_download_pdf_requires_auth_and_blocks_cross_tenant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        user_a, _ = await _register_user(client, "owner@example.com")
        _, headers_b = await _register_user(client, "other@example.com")

        owner_dir = os.path.join("./storage/users", user_a["id"], "cvs")
        os.makedirs(owner_dir, exist_ok=True)
        secret_pdf = os.path.join(owner_dir, "private_cv.pdf")
        with open(secret_pdf, "wb") as f:
            f.write(b"%PDF-1.4 secret")

        try:
            # Unauthenticated -> 401
            unauth = await client.get("/api/ai/download-pdf/private_cv.pdf")
            assert unauth.status_code == 401

            # Other user cannot read user A's PDF -> 404
            cross = await client.get("/api/ai/download-pdf/private_cv.pdf", headers=headers_b)
            assert cross.status_code == 404

            # Local directory import disabled by default -> 403
            dir_res = await client.post("/api/auth/onboarding/career-ops", json={"directory_path": "/etc"}, headers=headers_b)
            assert dir_res.status_code == 403
        finally:
            if os.path.exists(secret_pdf):
                os.remove(secret_pdf)


def test_cv_template_security_validators():
    with pytest.raises(ValidationError):
        CVTemplateBase(name="XSS Font", font_family="Inter; } body { display:none")

    with pytest.raises(ValidationError):
        CVTemplateBase(name="XSS Photo", has_photo=True, photo_url="javascript:alert(1)")

    tpl = CVTemplateBase(name="Safe Fallback Color", accent_color="red;background:url(x)")
    assert tpl.accent_color == "#2563eb"
