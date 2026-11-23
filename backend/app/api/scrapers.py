from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
import time
import logging

from backend.app.database import get_db, AsyncSessionLocal
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.scan import ScanHistory
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.scrapers.google_jobs import GoogleJobsScraper
from backend.app.scrapers.jobspy_scraper import JobSpyScraper
from backend.app.scrapers.ats_portals import ATSPortalsScraper
from backend.app.services.geo_filter import calculate_job_distance

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scrapers", tags=["Scrapers"])

SCRAPERS_MAP = {
    "netempregos": NetEmpregosScraper(),
    "google": GoogleJobsScraper(),
    "jobspy": JobSpyScraper(),
    "ats": ATSPortalsScraper()
}

async def run_scan_task(sources: List[str], query: str, location: Optional[str], limit_per_source: int):
    start_time = time.time()
    total_found = 0
    total_new = 0

    async with AsyncSessionLocal() as db:
        for src_name in sources:
            scraper = SCRAPERS_MAP.get(src_name)
            if not scraper:
                continue

            try:
                raw_jobs = await scraper.search(query=query, location=location, limit=limit_per_source)
                total_found += len(raw_jobs)
                
                for rj in raw_jobs:
                    # Check if already exists by job_key
                    stmt = select(Job).where(Job.job_key == rj["job_key"])
                    existing = (await db.execute(stmt)).scalar_one_or_none()
                    
                    if not existing:
                        # Calculate distance
                        dist = await calculate_job_distance(rj.get("location"), location or "Lisboa")
                        
                        new_job = Job(
                            job_key=rj["job_key"],
                            title=rj["title"],
                            company=rj["company"],
                            location=rj["location"],
                            is_remote=rj["is_remote"],
                            salary=rj["salary"],
                            description=rj["description"],
                            url=rj["url"],
                            source=rj["source"],
                            distance_km=dist,
                            raw_metadata=rj.get("raw_metadata")
                        )
                        db.add(new_job)
                        await db.flush() # Get new_job.id
                        
                        # Create initial application entry
                        new_app = Application(job_id=new_job.id, status="disponivel")
                        db.add(new_app)
                        total_new += 1

                await db.commit()

            except Exception as e:
                logger.error(f"Error executing scraper {src_name}: {e}")

        duration = time.time() - start_time
        scan_rec = ScanHistory(
            engine=",".join(sources),
            query=query,
            location=location,
            total_found=total_found,
            total_new=total_new,
            status="completed",
            duration_seconds=round(duration, 2)
        )
        db.add(scan_rec)
        await db.commit()

@router.post("/scan")
async def trigger_scan(
    sources: Optional[List[str]] = None,
    query: str = "Desenvolvedor",
    location: Optional[str] = "Lisboa",
    limit: int = 20,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    selected_sources = sources or ["netempregos", "ats"]
    background_tasks.add_task(run_scan_task, selected_sources, query, location, limit)
    return {
        "status": "started",
        "message": f"Varredura iniciada para '{query}' em '{location}' nas fontes: {', '.join(selected_sources)}",
        "sources": selected_sources
    }

@router.get("/history")
async def get_scan_history(limit: int = 15, db: AsyncSession = Depends(get_db)):
    stmt = select(ScanHistory).order_by(desc(ScanHistory.executed_at)).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()
