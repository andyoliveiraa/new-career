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
async def test_firebase_profile_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/profile")
        assert resp.status_code == 200
        data = resp.json()
        assert "André" in data["full_name"] or len(data["skills"]) > 0

@pytest.mark.asyncio
async def test_firebase_application_stats_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/applications/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_jobs" in data
        assert data["total_jobs"] >= 20

@pytest.mark.asyncio
async def test_firebase_jobs_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/jobs")
        assert resp.status_code == 200
        jobs = resp.json()
        assert len(jobs) >= 20
