from backend.app.api.jobs import router as jobs_router
from backend.app.api.applications import router as applications_router
from backend.app.api.profile import router as profile_router
from backend.app.api.scrapers import router as scrapers_router
from backend.app.api.ai import router as ai_router

__all__ = [
    "jobs_router",
    "applications_router",
    "profile_router",
    "scrapers_router",
    "ai_router"
]
