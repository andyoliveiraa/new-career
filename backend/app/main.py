from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.jobs import router as jobs_router
from backend.app.api.applications import router as applications_router
from backend.app.api.profile import router as profile_router
from backend.app.api.scrapers import router as scrapers_router
from backend.app.api.ai import router as ai_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("new_career")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    await init_db()
    logger.info("New Career backend ready!")
    yield
    logger.info("Shutting down New Career backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Plataforma de alta precisão para monitoramento de vagas, liveness check em tempo real, CVs ATS e tracking de candidaturas.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js / frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(jobs_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(scrapers_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "database": "sqlite_async",
        "scrapers": ["netempregos", "google", "jobspy", "careerops_ats"],
        "liveness_checker": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
