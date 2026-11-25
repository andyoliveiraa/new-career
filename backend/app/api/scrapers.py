import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.auth_utils import get_current_user
from backend.app.config import settings
from backend.app.firebase import firebase_manager
from backend.app.scrapers.ats_portals import ATSPortalsScraper
from backend.app.scrapers.google_jobs import GoogleJobsScraper
from backend.app.scrapers.jobspy_scraper import JobSpyScraper
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.security import decrypt_secret
from backend.app.services.discord_notifier import DiscordNotificationService
from backend.app.services.geo_filter import calculate_job_distance

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scrapers", tags=["Scrapers"])

SCRAPERS_MAP = {
    "netempregos": NetEmpregosScraper(),
    "google": GoogleJobsScraper(),
    "jobspy": JobSpyScraper(),
    "ats": ATSPortalsScraper()
}


class ScanRequest(BaseModel):
    sources: Optional[List[str]] = None
    query: Optional[str] = Field(default="", max_length=120)
    location: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)


async def _append_scan_log(user_id: str, scan_id: int, logs: List[str], message: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    logs.append(f"[{ts}] {message}")
    await firebase_manager.update_scan_history(user_id, scan_id, {"logs": list(logs)})


async def run_scan_task(
    user_id: str,
    scan_id: int,
    sources: List[str],
    query: str,
    location: Optional[str],
    limit_per_source: int
):
    start_time = time.time()
    total_found = 0
    total_new = 0
    new_jobs_list: List[Dict[str, Any]] = []
    logs: List[str] = []

    try:
        profile = await firebase_manager.get_profile(user_id)
        user_settings = await firebase_manager.get_user_settings(user_id)
        target_city = (location or profile.get("location") or settings.DEFAULT_CITY).strip()

        serpapi_key = decrypt_secret(user_settings.get("serpapi_api_key"))
        jsearch_key = decrypt_secret(user_settings.get("jsearch_api_key"))

        current_jobs = await firebase_manager.list_jobs(user_id=user_id, limit=1000)
        existing_keys = {j.get("job_key") for j in current_jobs}

        start_msg = (
            f"Varredura iniciada para '{query}' em '{target_city}'..."
            if query
            else f"Varredura iniciada em '{target_city}' (todas as áreas)..."
        )
        await _append_scan_log(user_id, scan_id, logs, start_msg)

        for src_name in sources:
            scraper = SCRAPERS_MAP.get(src_name)
            if not scraper:
                await _append_scan_log(user_id, scan_id, logs, f"Fonte desconhecida ignorada: {src_name}")
                continue

            await _append_scan_log(user_id, scan_id, logs, f"[{src_name}] A pesquisar ofertas...")
            try:
                if src_name == "google":
                    raw_jobs = await scraper.search(
                        query=query,
                        location=location,
                        limit=limit_per_source,
                        serpapi_key=serpapi_key,
                        jsearch_key=jsearch_key
                    )
                else:
                    raw_jobs = await scraper.search(query=query, location=location, limit=limit_per_source)

                total_found += len(raw_jobs)
                src_new = 0

                for rj in raw_jobs:
                    key = rj.get("job_key")
                    if key and key not in existing_keys:
                        dist = await calculate_job_distance(rj.get("location"), target_city)
                        new_id = firebase_manager.allocate_next_job_id(user_id)

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
                        src_new += 1

                await _append_scan_log(
                    user_id, scan_id, logs,
                    f"[{src_name}] Concluído: {len(raw_jobs)} encontradas, {src_new} novas."
                )

            except Exception as e:
                logger.error(f"Erro ao executar scraper {src_name}: {e}")
                await _append_scan_log(user_id, scan_id, logs, f"[{src_name}] Erro: {str(e)[:120]}")

        duration = round(time.time() - start_time, 2)
        await _append_scan_log(
            user_id, scan_id, logs,
            f"Varredura finalizada em {duration}s. Total: {total_found} encontradas, {total_new} novas."
        )
        await firebase_manager.update_scan_history(user_id, scan_id, {
            "total_found": total_found,
            "total_new": total_new,
            "status": "completed",
            "duration_seconds": duration,
            "logs": logs
        })

        if total_new > 0:
            try:
                discord_webhook = decrypt_secret(user_settings.get("discord_webhook_url"))
                notify_enabled = user_settings.get("discord_notify_on_new_jobs", True)
                if discord_webhook and notify_enabled:
                    await DiscordNotificationService.send_new_jobs_notification(
                        webhook_url=discord_webhook,
                        jobs=new_jobs_list,
                        query=query,
                        location=location
                    )
            except Exception as notify_err:
                logger.warning(f"Aviso ao enviar notificação Discord: {notify_err}")

    except Exception as fatal_err:
        duration = round(time.time() - start_time, 2)
        logger.error(f"Falha fatal na tarefa de varredura {scan_id}: {fatal_err}")
        await firebase_manager.update_scan_history(user_id, scan_id, {
            "status": "failed",
            "error_message": str(fatal_err),
            "duration_seconds": duration,
            "logs": logs + [f"Erro fatal: {fatal_err}"]
        })


@router.post("/scan")
async def trigger_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    selected_sources = [s for s in (request.sources or ["netempregos", "ats"]) if s in SCRAPERS_MAP]
    if not selected_sources:
        raise HTTPException(status_code=400, detail="Selecione pelo menos uma fonte válida para varredura.")

    clean_query = (request.query or "").strip()
    clean_location = (request.location or "").strip()
    if not clean_query and not clean_location:
        raise HTTPException(
            status_code=400,
            detail="Indique pelo menos um cargo/termo de pesquisa ou uma localização."
        )

    location_val = clean_location or settings.DEFAULT_CITY
    scan_record = await firebase_manager.add_scan_history(user_id, {
        "engine": ",".join(selected_sources),
        "query": clean_query,
        "location": location_val,
        "total_found": 0,
        "total_new": 0,
        "status": "running",
        "duration_seconds": None,
        "logs": ["Varredura agendada na fila do servidor..."]
    })

    background_tasks.add_task(
        run_scan_task,
        user_id,
        scan_record["id"],
        selected_sources,
        clean_query,
        location_val,
        request.limit
    )

    search_desc = f"para '{clean_query}' em '{location_val}'" if clean_query else f"em '{location_val}' (todas as áreas)"
    return {
        "status": "started",
        "scan_id": scan_record["id"],
        "message": f"Varredura iniciada {search_desc} nas fontes: {', '.join(selected_sources)}",
        "sources": selected_sources
    }


@router.get("/scan/{scan_id}")
async def get_scan_status(scan_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    rec = await firebase_manager.get_scan_by_id(current_user["id"], scan_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Registo de varredura não encontrado.")
    return rec


@router.get("/history")
async def get_scan_history(limit: int = 15, current_user: Dict[str, Any] = Depends(get_current_user)):
    return await firebase_manager.get_scan_history(current_user["id"], limit=limit)
