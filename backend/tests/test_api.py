import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db

@pytest.mark.asyncio
async def test_health_check():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert "New Career" in data["project"]

@pytest.mark.asyncio
async def test_profile_api():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/profile")
        assert resp.status_code == 200
        data = resp.json()
        assert "full_name" in data
        assert len(data["skills"]) > 0

@pytest.mark.asyncio
async def test_application_stats_api():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/applications/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_jobs" in data
