from pydantic import BaseModel, Field
from typing import Optional


class UserSettingsBase(BaseModel):
    discord_webhook_url: Optional[str] = Field(default=None, description="URL do webhook do canal do Discord")
    discord_notify_on_new_jobs: bool = Field(default=True, description="Notificar quando novas vagas forem descobertas")
    discord_notify_on_status_change: bool = Field(default=True, description="Notificar quando houver avanço no pipeline")
    primary_ai_provider: Optional[str] = Field(default="gemini", description="gemini, groq, openai")
    gemini_api_key: Optional[str] = Field(default=None, description="Chave da API do Google Gemini")
    openai_api_key: Optional[str] = Field(default=None, description="Chave da API da OpenAI")
    groq_api_key: Optional[str] = Field(default=None, description="Chave da API da Groq Cloud")
    serpapi_api_key: Optional[str] = Field(default=None, description="Chave da API SerpApi")
    jsearch_api_key: Optional[str] = Field(default=None, description="Chave da API RapidAPI JSearch")


class UserSettingsUpdate(BaseModel):
    discord_webhook_url: Optional[str] = None
    discord_notify_on_new_jobs: Optional[bool] = None
    discord_notify_on_status_change: Optional[bool] = None
    primary_ai_provider: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None
    jsearch_api_key: Optional[str] = None


class UserSettingsResponse(BaseModel):
    user_id: str
    discord_webhook_url: Optional[str] = None
    discord_webhook_url_masked: Optional[str] = None
    discord_notify_on_new_jobs: bool = True
    discord_notify_on_status_change: bool = True
    primary_ai_provider: str = "gemini"
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None
    jsearch_api_key: Optional[str] = None
    gemini_api_key_masked: Optional[str] = None
    openai_api_key_masked: Optional[str] = None
    groq_api_key_masked: Optional[str] = None
    serpapi_api_key_masked: Optional[str] = None
    jsearch_api_key_masked: Optional[str] = None
    has_gemini_key: bool = False
    has_openai_key: bool = False
    has_groq_key: bool = False
    has_serpapi_key: bool = False
    has_jsearch_key: bool = False
    has_discord_webhook: bool = False
    updated_at: Optional[str] = None


class TestKeyRequest(BaseModel):
    provider: str = Field(..., description="gemini, openai, groq, serpapi, jsearch")
    api_key: Optional[str] = Field(default=None, description="Chave a testar (opcional; se omitida, usa a guardada)")


class TestKeyResponse(BaseModel):
    provider: str
    valid: bool
    message: str
    status: str
    latency_ms: Optional[float] = None
    details: Optional[str] = None


class TestWebhookRequest(BaseModel):
    webhook_url: Optional[str] = Field(default=None, description="URL do webhook a testar (se omitida, usa a guardada)")


class TestWebhookResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
