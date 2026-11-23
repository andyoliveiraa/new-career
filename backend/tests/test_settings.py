import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.discord_notifier import DiscordNotificationService
from backend.app.services.key_tester import KeyTesterService

def test_discord_url_validation():
    valid_url = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ-123456"
    assert DiscordNotificationService.is_valid_webhook_url(valid_url) is True

    valid_url_app = "https://discordapp.com/api/webhooks/123456789012345678/abc-XYZ_123"
    assert DiscordNotificationService.is_valid_webhook_url(valid_url_app) is True

    invalid_url = "https://malicious.com/api/webhooks/123/abc"
    assert DiscordNotificationService.is_valid_webhook_url(invalid_url) is False

    empty_url = ""
    assert DiscordNotificationService.is_valid_webhook_url(empty_url) is False

@pytest.mark.asyncio
async def test_key_tester_empty_and_invalid():
    res = await KeyTesterService.test_key("gemini", "")
    assert res["valid"] is False
    assert res["status"] == "invalid"

    # Test unknown provider
    unknown_res = await KeyTesterService.test_key("unknown_provider", "some_key")
    assert unknown_res["valid"] is False
    assert "não suportado" in unknown_res["message"]

@pytest.mark.asyncio
async def test_settings_api_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register test user
        register_res = await ac.post("/api/auth/register", json={
            "email": "settings_user@example.com",
            "password": "password123",
            "full_name": "Settings Tester"
        })
        assert register_res.status_code == 200
        token = register_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Get initial settings
        get_res = await ac.get("/api/settings", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["user_id"] is not None
        assert data["has_discord_webhook"] is False
        assert data["has_gemini_key"] is False

        # 2. Update settings
        update_payload = {
            "discord_webhook_url": "https://discord.com/api/webhooks/111222333444555666/Sample-Webhook-Token_123",
            "discord_notify_on_new_jobs": True,
            "discord_notify_on_status_change": False,
            "primary_ai_provider": "groq",
            "gemini_api_key": "AIzaSyFakeKeyForTesting12345",
            "groq_api_key": "gsk_SampleGroqKey123"
        }
        put_res = await ac.put("/api/settings", json=update_payload, headers=headers)
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["has_discord_webhook"] is True
        assert updated["has_gemini_key"] is True
        assert updated["has_groq_key"] is True
        assert updated["primary_ai_provider"] == "groq"
        assert updated["discord_notify_on_status_change"] is False

        # 3. Test Webhook with invalid URL
        invalid_webhook_res = await ac.post("/api/settings/test-webhook", json={
            "webhook_url": "https://invalid-site.com/webhook"
        }, headers=headers)
        assert invalid_webhook_res.status_code == 200
        assert invalid_webhook_res.json()["success"] is False

        # 4. Test Key with empty key
        test_key_res = await ac.post("/api/settings/test-key", json={
            "provider": "gemini",
            "api_key": ""
        }, headers=headers)
        assert test_key_res.status_code == 200
        # When api_key is empty string or None, it tests the saved key from step 2
        # Which will return invalid because it's a fake key
        assert test_key_res.json()["valid"] is False
