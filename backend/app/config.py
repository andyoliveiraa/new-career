import logging
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

INSECURE_DEFAULT_JWT_SECRET = "change-me-in-production-use-at-least-32-chars"


class Settings(BaseSettings):
    PROJECT_NAME: str = "New Career"
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./new_career.db"

    # AI API Keys & Models
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Scraper Search Settings
    SERPAPI_API_KEY: Optional[str] = None
    JSEARCH_API_KEY: Optional[str] = None
    DEFAULT_CITIES: str = "Lisboa, Porto, Coimbra, Braga, Aveiro, Remoto"
    DEFAULT_KEYWORDS: str = "Software Engineer, Desenvolvedor Python, Full Stack, Frontend, Data Engineer"
    DEFAULT_CITY: str = "Lisboa"
    DEFAULT_COUNTRY: str = "Portugal"

    # Geolocation Radius (km)
    MAX_DISTANCE_KM: float = 25.0

    # Storage
    STORAGE_DIR: str = "./storage"

    # Firebase Settings
    FIREBASE_CREDENTIALS_PATH: Optional[str] = "./firebase-credentials.json"
    FIREBASE_PROJECT_ID: Optional[str] = None
    USE_FIREBASE: bool = True

    # Onboarding safety
    ALLOW_LOCAL_DIR_IMPORT: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Auth, Encryption & JWT Settings
    JWT_SECRET: str = INSECURE_DEFAULT_JWT_SECRET
    SETTINGS_ENCRYPTION_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in (self.CORS_ORIGINS or "").split(",") if o.strip()]
        return origins or ["http://localhost:5173"]

    def validate_security(self) -> None:
        is_default = self.JWT_SECRET == INSECURE_DEFAULT_JWT_SECRET or len(self.JWT_SECRET) < 16
        if self.APP_ENV.lower() == "production" and is_default:
            raise RuntimeError(
                "JWT_SECRET inseguro ou não definido em ambiente de produção. "
                "Defina uma chave forte (>= 32 caracteres) no ficheiro .env."
            )
        if is_default:
            logger.warning(
                "JWT_SECRET está com valor de desenvolvimento por omissão. "
                "Configure JWT_SECRET no ficheiro .env antes de publicar."
            )


settings = Settings()
settings.validate_security()
