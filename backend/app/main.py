from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.firebase import firebase_manager
from backend.app.api.auth import router as auth_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.applications import router as applications_router
from backend.app.api.profile import router as profile_router
from backend.app.api.scrapers import router as scrapers_router
from backend.app.api.ai import router as ai_router
from backend.app.api.cv_templates import router as cv_templates_router
from backend.app.api.settings import router as settings_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("new_career")


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_mode = "cloud_firestore" if firebase_manager._is_live else "local_firestore"
    logger.info(f"New Career backend pronto (modo de armazenamento: {storage_mode}).")
    yield
    logger.info("Shutting down New Career backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Plataforma de alta precisão para monitoramento de vagas, liveness check em tempo real, CVs ATS e tracking de candidaturas.",
    version="1.1.0",
    lifespan=lifespan
)

origins = settings.cors_origins_list
allow_wildcard = "*" in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not allow_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(scrapers_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(cv_templates_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "environment": settings.APP_ENV,
        "database": "cloud_firestore" if firebase_manager._is_live else "local_firestore",
        "scrapers": ["netempregos", "google", "jobspy", "careerops_ats"],
        "liveness_checker": "active"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
