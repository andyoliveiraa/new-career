from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException

from backend.app.firebase import firebase_manager
from backend.app.auth_utils import get_current_user
from backend.app.schemas.settings import (
    UserSettingsUpdate,
    UserSettingsResponse,
    TestKeyRequest,
    TestKeyResponse,
    TestWebhookRequest,
    TestWebhookResponse
)
from backend.app.services.key_tester import KeyTesterService
from backend.app.services.discord_notifier import DiscordNotificationService

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=UserSettingsResponse)
async def get_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    data = await firebase_manager.get_user_settings(user_id)

    return UserSettingsResponse(
        user_id=user_id,
        discord_webhook_url=data.get("discord_webhook_url"),
        discord_notify_on_new_jobs=data.get("discord_notify_on_new_jobs", True),
        discord_notify_on_status_change=data.get("discord_notify_on_status_change", True),
        primary_ai_provider=data.get("primary_ai_provider", "gemini"),
        gemini_api_key=data.get("gemini_api_key"),
        openai_api_key=data.get("openai_api_key"),
        groq_api_key=data.get("groq_api_key"),
        serpapi_api_key=data.get("serpapi_api_key"),
        jsearch_api_key=data.get("jsearch_api_key"),
        has_gemini_key=bool(data.get("gemini_api_key")),
        has_openai_key=bool(data.get("openai_api_key")),
        has_groq_key=bool(data.get("groq_api_key")),
        has_serpapi_key=bool(data.get("serpapi_api_key")),
        has_jsearch_key=bool(data.get("jsearch_api_key")),
        has_discord_webhook=bool(data.get("discord_webhook_url")),
        updated_at=data.get("updated_at")
    )

@router.put("", response_model=UserSettingsResponse)
async def update_settings(request: UserSettingsUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    update_data = request.model_dump(exclude_unset=True)

    saved = await firebase_manager.save_user_settings(user_id, update_data)

    return UserSettingsResponse(
        user_id=user_id,
        discord_webhook_url=saved.get("discord_webhook_url"),
        discord_notify_on_new_jobs=saved.get("discord_notify_on_new_jobs", True),
        discord_notify_on_status_change=saved.get("discord_notify_on_status_change", True),
        primary_ai_provider=saved.get("primary_ai_provider", "gemini"),
        gemini_api_key=saved.get("gemini_api_key"),
        openai_api_key=saved.get("openai_api_key"),
        groq_api_key=saved.get("groq_api_key"),
        serpapi_api_key=saved.get("serpapi_api_key"),
        jsearch_api_key=saved.get("jsearch_api_key"),
        has_gemini_key=bool(saved.get("gemini_api_key")),
        has_openai_key=bool(saved.get("openai_api_key")),
        has_groq_key=bool(saved.get("groq_api_key")),
        has_serpapi_key=bool(saved.get("serpapi_api_key")),
        has_jsearch_key=bool(saved.get("jsearch_api_key")),
        has_discord_webhook=bool(saved.get("discord_webhook_url")),
        updated_at=saved.get("updated_at")
    )

@router.post("/test-key", response_model=TestKeyResponse)
async def test_api_key(request: TestKeyRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    provider = request.provider.strip().lower()
    key_to_test = request.api_key

    # If no key was passed in request, look up saved key for current user
    if not key_to_test:
        settings = await firebase_manager.get_user_settings(user_id)
        field_map = {
            "gemini": "gemini_api_key",
            "openai": "openai_api_key",
            "groq": "groq_api_key",
            "serpapi": "serpapi_api_key",
            "jsearch": "jsearch_api_key"
        }
        field_name = field_map.get(provider)
        if field_name:
            key_to_test = settings.get(field_name)

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

    # If no webhook url was passed in request, look up saved webhook for current user
    if not webhook_url:
        settings = await firebase_manager.get_user_settings(user_id)
        webhook_url = settings.get("discord_webhook_url")

    if not webhook_url:
        return TestWebhookResponse(
            success=False,
            message="Nenhum URL de Webhook do Discord configurado ou fornecido.",
            latency_ms=None
        )

    user_name = current_user.get("full_name") or current_user.get("email") or "Utilizador"
    res = await DiscordNotificationService.send_test_notification(webhook_url, user_name)
    return TestWebhookResponse(**res)
