from typing import Any, Dict
from fastapi import APIRouter, Depends

from backend.app.auth_utils import get_current_user
from backend.app.firebase import firebase_manager
from backend.app.schemas.settings import (
    TestKeyRequest,
    TestKeyResponse,
    TestWebhookRequest,
    TestWebhookResponse,
    UserSettingsResponse,
    UserSettingsUpdate,
)
from backend.app.security import decrypt_secret, encrypt_secret, is_masked_value, mask_secret
from backend.app.services.discord_notifier import DiscordNotificationService
from backend.app.services.key_tester import KeyTesterService

router = APIRouter(prefix="/settings", tags=["Settings"])

SECRET_FIELDS = (
    "discord_webhook_url",
    "gemini_api_key",
    "openai_api_key",
    "groq_api_key",
    "serpapi_api_key",
    "jsearch_api_key",
)


def _to_settings_response(user_id: str, data: Dict[str, Any]) -> UserSettingsResponse:
    return UserSettingsResponse(
        user_id=user_id,
        discord_webhook_url=None,
        discord_webhook_url_masked=mask_secret(data.get("discord_webhook_url")),
        discord_notify_on_new_jobs=data.get("discord_notify_on_new_jobs", True),
        discord_notify_on_status_change=data.get("discord_notify_on_status_change", True),
        primary_ai_provider=data.get("primary_ai_provider", "gemini"),
        gemini_api_key=None,
        openai_api_key=None,
        groq_api_key=None,
        serpapi_api_key=None,
        jsearch_api_key=None,
        gemini_api_key_masked=mask_secret(data.get("gemini_api_key")),
        openai_api_key_masked=mask_secret(data.get("openai_api_key")),
        groq_api_key_masked=mask_secret(data.get("groq_api_key")),
        serpapi_api_key_masked=mask_secret(data.get("serpapi_api_key")),
        jsearch_api_key_masked=mask_secret(data.get("jsearch_api_key")),
        has_gemini_key=bool(decrypt_secret(data.get("gemini_api_key"))),
        has_openai_key=bool(decrypt_secret(data.get("openai_api_key"))),
        has_groq_key=bool(decrypt_secret(data.get("groq_api_key"))),
        has_serpapi_key=bool(decrypt_secret(data.get("serpapi_api_key"))),
        has_jsearch_key=bool(decrypt_secret(data.get("jsearch_api_key"))),
        has_discord_webhook=bool(decrypt_secret(data.get("discord_webhook_url"))),
        updated_at=data.get("updated_at")
    )


@router.get("", response_model=UserSettingsResponse)
async def get_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    data = await firebase_manager.get_user_settings(user_id)
    return _to_settings_response(user_id, data)


@router.put("", response_model=UserSettingsResponse)
async def update_settings(request: UserSettingsUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    update_data = request.model_dump(exclude_unset=True)

    cleaned_payload: Dict[str, Any] = {}
    for key, val in update_data.items():
        if key in SECRET_FIELDS:
            if val is None or is_masked_value(val):
                continue
            stripped = val.strip()
            cleaned_payload[key] = encrypt_secret(stripped) if stripped else ""
        else:
            cleaned_payload[key] = val

    saved = await firebase_manager.save_user_settings(user_id, cleaned_payload)
    await firebase_manager.record_metric("settings_updates", user_id)
    return _to_settings_response(user_id, saved)


@router.post("/test-key", response_model=TestKeyResponse)
async def test_api_key(request: TestKeyRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    provider = request.provider.strip().lower()
    key_to_test = request.api_key

    if not key_to_test or is_masked_value(key_to_test):
        user_settings = await firebase_manager.get_user_settings(user_id)
        field_map = {
            "gemini": "gemini_api_key",
            "openai": "openai_api_key",
            "groq": "groq_api_key",
            "serpapi": "serpapi_api_key",
            "jsearch": "jsearch_api_key"
        }
        field_name = field_map.get(provider)
        if field_name:
            key_to_test = decrypt_secret(user_settings.get(field_name))

    if not key_to_test:
        return TestKeyResponse(
            provider=provider,
            valid=False,
            status="invalid",
            message=f"Nenhuma chave configurada ou fornecida para {provider.title()}.",
            latency_ms=None,
            details="Insira a chave no campo de texto antes de testar."
        )

    res = await KeyTesterService.test_key(provider, key_to_test)
    return TestKeyResponse(**res)


@router.post("/test-webhook", response_model=TestWebhookResponse)
async def test_discord_webhook(request: TestWebhookRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    webhook_url = request.webhook_url

    if not webhook_url or is_masked_value(webhook_url):
        user_settings = await firebase_manager.get_user_settings(user_id)
        webhook_url = decrypt_secret(user_settings.get("discord_webhook_url"))

    if not webhook_url:
        return TestWebhookResponse(
            success=False,
            message="Nenhum URL de Webhook do Discord configurado ou fornecido.",
            latency_ms=None
        )

    user_name = current_user.get("full_name") or current_user.get("email") or "Utilizador"
    res = await DiscordNotificationService.send_test_notification(webhook_url, user_name)
    return TestWebhookResponse(**res)
