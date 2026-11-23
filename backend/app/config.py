from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "New Career"
    DATABASE_URL: str = "sqlite+aiosqlite:///./new_career.db"
    
    # AI API Keys
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    
    # Scraper Search Settings
    SERPAPI_API_KEY: Optional[str] = os.getenv("SERPAPI_API_KEY")
    JSEARCH_API_KEY: Optional[str] = os.getenv("JSEARCH_API_KEY")
    DEFAULT_CITIES: str = "Lisboa, Porto, Coimbra, Braga, Aveiro, Remoto"
    DEFAULT_KEYWORDS: str = "Software Engineer, Desenvolvedor Python, Full Stack, Frontend, Data Engineer"
    
    # Geolocation Radius (km)
    MAX_DISTANCE_KM: float = 25.0
    
    # Storage
    STORAGE_DIR: str = "./storage"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
