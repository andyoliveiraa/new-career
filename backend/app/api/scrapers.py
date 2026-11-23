from fastapi import APIRouter, BackgroundTasks, Depends
from typing import List, Optional, Dict, Any
import time
import logging

from backend.app.firebase import firebase_manager
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.scrapers.google_jobs import GoogleJobsScraper
from backend.app.scrapers.jobspy_scraper import JobSpyScraper
from backend.app.scrapers.ats_portals import ATSPortalsScraper
from backend.app.services.geo_filter import calculate_job_distance
from backend.app.auth_utils import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scrapers", tags=["Scrapers"])

SCRAPERS_MAP = {
    "netempregos": NetEmpregosScraper(),
    "google": GoogleJobsScraper(),
    "jobspy": JobSpyScraper(),
    "ats": ATSPortalsScraper()
}

async def run_scan_task(user_id: str, sources: List[str], query: str, location: Optional[str], limit_per_source: int):
    start_time = time.time()
    total_found = 0
    total_new = 0
    new_jobs_list: List[Dict[str, Any]] = []

    current_jobs = await firebase_manager.list_jobs(user_id=user_id, limit=1000)
    existing_keys = {j.get("job_key") for j in current_jobs}
    next_id = max([int(j.get("id", 0)) for j in current_jobs], default=0) + 1

    for src_name in sources:
        scraper = SCRAPERS_MAP.get(src_name)
        if not scraper:
            continue

        try:
            raw_jobs = await scraper.search(query=query, location=location, limit=limit_per_source)
            total_found += len(raw_jobs)

            for rj in raw_jobs:
                key = rj.get("job_key")
                if key not in existing_keys:
                    dist = await calculate_job_distance(rj.get("location"), location or "Covilhã")
                    new_id = next_id
                    next_id += 1

                    job_record = {
                        "id": new_id,
                        "job_key": key,
                        "title": rj["title"],
                        "company": rj["company"],
                        "location": rj["location"],
                        "is_remote": rj["is_remote"],
                        "salary": rj.get("salary"),
                        "description": rj.get("description"),
                        "url": rj["url"],
                        "source": rj["source"],
                        "distance_km": dist,
                        "liveness_status": "active",
                        "application_status": "disponivel",
                        "raw_metadata": rj.get("raw_metadata")
                    }

                    await firebase_manager.save_job(user_id, job_record)
                    await firebase_manager.save_application(user_id, new_id, {"status": "disponivel"})

                    existing_keys.add(key)
                    new_jobs_list.append(job_record)
                    total_new += 1

        except Exception as e:
            logger.error(f"Erro ao executar scraper {src_name} no Firebase: {e}")

    duration = time.time() - start_time
    await firebase_manager.add_scan_history(user_id, {
        "engine": ",".join(sources),
        "query": query,
        "location": location,
        "total_found": total_found,
        "total_new": total_new,
        "status": "completed",
        "duration_seconds": round(duration, 2)
    })

    # Trigger Discord Webhook Notification if enabled
    if total_new > 0:
        try:
            user_settings = await firebase_manager.get_user_settings(user_id)
            discord_webhook = user_settings.get("discord_webhook_url")
            notify_enabled = user_settings.get("discord_notify_on_new_jobs", True)

            if discord_webhook and notify_enabled:
                from backend.app.services.discord_notifier import DiscordNotificationService
                await DiscordNotificationService.send_new_jobs_notification(
                    webhook_url=discord_webhook,
                    jobs=new_jobs_list,
                    query=query,
                    location=location
                )
        except Exception as notify_err:
            logger.warning(f"Aviso ao enviar notificação de novas vagas para Discord: {notify_err}")

@router.post("/scan")
async def trigger_scan(
    sources: Optional[List[str]] = None,
    query: str = "Desenvolvedor",
    location: Optional[str] = "Lisboa",
    limit: int = 20,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    selected_sources = sources or ["netempregos", "ats"]
    background_tasks.add_task(run_scan_task, current_user["id"], selected_sources, query, location, limit)
    return {
        "status": "started",
        "message": f"Varredura iniciada no Firebase para '{query}' em '{location}' nas fontes: {', '.join(selected_sources)}",
        "sources": selected_sources
    }

@router.get("/history")
async def get_scan_history(limit: int = 15, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    return await firebase_manager.get_scan_history(user_id, limit=limit)
