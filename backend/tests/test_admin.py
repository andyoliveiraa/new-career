import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.firebase import firebase_manager
from backend.app.main import app
from backend.app.config import settings
from backend.app.auth_utils import hash_password


@pytest.fixture(autouse=True)
def clean_store_admin():
    firebase_manager._local_data = {"users": {}, "user_data": {}}
    firebase_manager._save_local_store()
    yield
    firebase_manager._local_data = {"users": {}, "user_data": {}}
    firebase_manager._save_local_store()


@pytest.mark.asyncio
async def test_admin_login_valid_credentials():
    """Admin login succeeds with correct credentials and returns role=admin JWT."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "Mirandela2023!"
        })
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body

        # Decode and check role
        from backend.app.auth_utils import decode_access_token
        decoded = decode_access_token(body["access_token"])
        assert decoded is not None
        assert decoded.get("role") == "admin"
        assert decoded.get("sub") == "admin"


@pytest.mark.asyncio
async def test_admin_login_wrong_password():
    """Admin login fails with wrong password -> 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "WrongPassword999!"
        })
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_wrong_email():
    """Admin login fails with wrong email -> 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/admin/login", json={
            "email": "hacker@example.com",
            "password": "Mirandela2023!"
        })
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_admin_users_requires_auth():
    """GET /api/admin/users without token -> 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/admin/users")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_admin_users_rejects_regular_user_token():
    """GET /api/admin/users with a regular user JWT -> 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "regular@example.com",
            "password": "Password123!"
        })
        assert reg.status_code == 200
        user_token = reg.json()["access_token"]

        res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {user_token}"})
        assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_users_returns_list_without_password_hash():
    """Admin can list users, response never includes password_hash."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register some regular users
        for i in range(3):
            await client.post("/api/auth/register", json={
                "full_name": f"User {i}",
                "email": f"user{i}@example.com",
                "password": "Password123!"
            })

        # Login as admin
        login_res = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "Mirandela2023!"
        })
        admin_token = login_res.json()["access_token"]

        # Get users list
        res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        body = res.json()
        assert "users" in body
        assert "total" in body
        assert body["total"] >= 3

        for user in body["users"]:
            # Must never leak password hash
            assert "password_hash" not in user
            # Must have safe fields
            assert "id" in user
            assert "email" in user
            assert "full_name" in user


@pytest.mark.asyncio
async def test_admin_metrics_returns_platform_stats():
    """Admin metrics endpoint returns total_users and metric counts."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login_res = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "Mirandela2023!"
        })
        admin_token = login_res.json()["access_token"]

        res = await client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        body = res.json()
        assert "total_users" in body
        assert "platform_totals" in body
        assert "today_metrics" in body
        assert "date" in body


@pytest.mark.asyncio
async def test_last_login_at_recorded_on_login():
    """Login sets last_login_at on user record."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/api/auth/register", json={
            "full_name": "Login Track",
            "email": "logintrack@example.com",
            "password": "Password123!"
        })
        # Login to trigger last_login_at update
        login_res = await client.post("/api/auth/login", json={
            "email": "logintrack@example.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200

        # Fetch as admin and verify last_login_at is set
        admin_login = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "Mirandela2023!"
        })
        admin_token = admin_login.json()["access_token"]

        users_res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        users = users_res.json()["users"]
        track_user = next((u for u in users if u["email"] == "logintrack@example.com"), None)
        assert track_user is not None
        assert track_user["last_login_at"] is not None
        assert track_user["last_seen_at"] is not None


@pytest.mark.asyncio
async def test_heartbeat_updates_online_users_count():
    """POST /api/analytics/heartbeat updates last_seen_at and increments online_users."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        reg = await client.post("/api/auth/register", json={
            "full_name": "Online User",
            "email": "online@example.com",
            "password": "Password123!"
        })
        assert reg.status_code == 200
        user_token = reg.json()["access_token"]

        hb = await client.post("/api/analytics/heartbeat", headers={"Authorization": f"Bearer {user_token}"})
        assert hb.status_code == 200
        assert hb.json()["ok"] is True

        admin_login = await client.post("/api/admin/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "Mirandela2023!"
        })
        admin_token = admin_login.json()["access_token"]

        metrics_res = await client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {admin_token}"})
        assert metrics_res.status_code == 200
        assert metrics_res.json()["online_users"] >= 1
