import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert "New Career" in data["project"]

@pytest.mark.asyncio
async def test_auth_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Without token, endpoints must return 401 Unauthorized
        resp_jobs = await client.get("/api/jobs")
        assert resp_jobs.status_code == 401

        resp_stats = await client.get("/api/applications/stats")
        assert resp_stats.status_code == 401

        resp_prof = await client.get("/api/profile")
        assert resp_prof.status_code == 401
