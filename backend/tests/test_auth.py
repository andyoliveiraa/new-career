import pytest
import os
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

        # 4. Onboarding Career-Ops for User A
        headers_a = {"Authorization": f"Bearer {token_a}"}
        career_ops_path = r"C:\Users\andy_\Desktop\IA\career-ops"
        onboard_res = await client.post(
            "/api/auth/onboarding/career-ops",
            headers=headers_a,
            json={"directory_path": career_ops_path}
        )
        assert onboard_res.status_code == 200
        onboard_data = onboard_res.json()
        assert onboard_data["success"] is True
        assert onboard_data["jobs_count"] >= 20
        assert onboard_data["experiences_count"] >= 5
        assert onboard_data["cv_base_loaded"] is True

        # 5. User A checks their jobs
        jobs_a = await client.get("/api/jobs", headers=headers_a)
        assert jobs_a.status_code == 200
        assert len(jobs_a.json()) >= 20

        stats_a = await client.get("/api/applications/stats", headers=headers_a)
        assert stats_a.status_code == 200
        assert stats_a.json()["total_jobs"] >= 20

        # 6. Register User B (Brand new user)
        reg_b = await client.post("/api/auth/register", json={
            "full_name": "Utilizador Dois",
            "email": "outro.user@ubi.pt",
            "password": "SecretPassword!"
        })
        assert reg_b.status_code == 200
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 7. Verify Multi-Tenant Data Isolation: User B has 0 jobs and clean profile!
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
