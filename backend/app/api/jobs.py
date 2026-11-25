import asyncio
import csv
import hashlib
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from backend.app.auth_utils import get_current_user
from backend.app.config import settings
from backend.app.firebase import firebase_manager
from backend.app.schemas.job import BatchLivenessRequest, JobResponse, ManualJobCreate
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.services.geo_filter import calculate_job_distance
from backend.app.services.liveness import LivenessService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _to_job_response(rj: Dict[str, Any], fallback_id: int = 0) -> JobResponse:
    now = datetime.now(timezone.utc)
    return JobResponse(
        id=int(rj.get("id", fallback_id)),
        job_key=rj.get("job_key", ""),
        title=rj.get("title", ""),
        company=rj.get("company", ""),
        location=rj.get("location"),
        is_remote=bool(rj.get("is_remote", False)),
        salary=rj.get("salary"),
        description=rj.get("description"),
        url=rj.get("url", ""),
        source=rj.get("source", "web"),
        liveness_status=rj.get("liveness_status", "unknown"),
        liveness_checked_at=rj.get("liveness_checked_at"),
        liveness_reason=rj.get("liveness_reason"),
        distance_km=rj.get("distance_km"),
        published_at=rj.get("published_at"),
        created_at=rj.get("created_at") or now,
        updated_at=rj.get("updated_at") or now,
        application_status=rj.get("application_status") or "disponivel",
        match_score=rj.get("match_score")
    )


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None,
    liveness: Optional[str] = None,
    is_remote: Optional[bool] = None,
    max_distance: Optional[float] = Query(None, ge=0),
    sort_by: str = Query("created_at", pattern="^(created_at|match_score|distance_km)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    raw_jobs = await firebase_manager.list_jobs(
        user_id=user_id,
        query=query,
        location=location,
        source=source,
        status=status,
        liveness=liveness,
        is_remote=is_remote,
        max_distance=max_distance,
        sort_by=sort_by,
        limit=limit,
        offset=offset
    )
    return [_to_job_response(rj) for rj in raw_jobs]


@router.post("", response_model=JobResponse)
async def create_manual_job(
    req: ManualJobCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Adicionar manualmente uma vaga por URL com deteção de duplicados e distância."""
    user_id = current_user["id"]
    url = req.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="URL da vaga inválido. Deve começar por http:// ou https://.")

    source = req.source or "manual"
    if "net-empregos.com" in parsed.netloc:
        source = "netempregos"
    elif "linkedin.com" in parsed.netloc:
        source = "linkedin"
    elif "greenhouse.io" in parsed.netloc:
        source = "greenhouse"
    elif "lever.co" in parsed.netloc:
        source = "lever"
    elif "ashbyhq.com" in parsed.netloc:
        source = "ashby"

    job_key = hashlib.sha256(f"{source}:{url}".encode()).hexdigest()[:24]
    existing_jobs = await firebase_manager.list_jobs(user_id=user_id, limit=1000)
    for ej in existing_jobs:
        if ej.get("job_key") == job_key or ej.get("url") == url:
            return _to_job_response(ej)

    description = req.description
    if not description and "net-empregos.com" in parsed.netloc:
        description = await NetEmpregosScraper().fetch_job_description(url)

    profile = await firebase_manager.get_profile(user_id)
    target_city = profile.get("location") or settings.DEFAULT_CITY
    loc = req.location or ("Remoto" if req.is_remote else settings.DEFAULT_COUNTRY)
    dist = 0.0 if req.is_remote else await calculate_job_distance(loc, target_city)

    new_id = firebase_manager.allocate_next_job_id(user_id)
    job_record = {
        "id": new_id,
        "job_key": job_key,
        "title": (req.title or "").strip() or "Vaga Adicionada Manualmente",
        "company": (req.company or "").strip() or parsed.netloc.replace("www.", ""),
        "location": loc,
        "is_remote": bool(req.is_remote),
        "salary": req.salary,
        "description": description,
        "url": url,
        "source": source,
        "distance_km": dist,
        "liveness_status": "unknown",
        "application_status": "disponivel"
    }
    saved = await firebase_manager.save_job(user_id, job_record)
    await firebase_manager.save_application(user_id, new_id, {"status": "disponivel"})
    await firebase_manager.record_metric("manual_jobs_created", user_id)
    return _to_job_response(saved, fallback_id=new_id)


@router.get("/export")
async def export_jobs(
    format: str = Query("csv", pattern="^(csv|json)$"),
    status: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Exportar vagas e estado de candidaturas do utilizador em CSV ou JSON."""
    user_id = current_user["id"]
    jobs = await firebase_manager.list_jobs(user_id=user_id, status=status, limit=1000)
    apps = await firebase_manager.list_applications(user_id)

    rows = []
    for j in jobs:
        app = apps.get(str(j.get("id")), {})
        rows.append({
            "id": j.get("id"),
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "location": j.get("location", ""),
            "is_remote": bool(j.get("is_remote", False)),
            "salary": j.get("salary") or "",
            "source": j.get("source", ""),
            "liveness_status": j.get("liveness_status", "unknown"),
            "application_status": app.get("status") or j.get("application_status") or "disponivel",
            "match_score": app.get("match_score") or j.get("match_score") or "",
            "applied_at": app.get("applied_at") or "",
            "notes": app.get("notes") or "",
            "url": j.get("url", "")
        })

    if format == "json":
        payload = json.dumps(rows, indent=2, ensure_ascii=False, default=str)
        await firebase_manager.record_metric("jobs_exported", user_id)
        return Response(
            content=payload,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="new-career-jobs.json"'}
        )

    output = io.StringIO()
    fieldnames = [
        "id", "title", "company", "location", "is_remote", "salary",
        "source", "liveness_status", "application_status", "match_score",
        "applied_at", "notes", "url"
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    await firebase_manager.record_metric("jobs_exported", user_id)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="new-career-jobs.csv"'}
    )


@router.post("/check-liveness-batch")
async def check_liveness_batch(
    req: BatchLivenessRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Verificar disponibilidade em lote para várias vagas do utilizador."""
    user_id = current_user["id"]
    all_jobs = await firebase_manager.list_jobs(user_id=user_id, limit=500)

    if req.job_ids:
        id_set = set(req.job_ids)
        targets = [j for j in all_jobs if int(j.get("id", 0)) in id_set]
    else:
        targets = [
            j for j in all_jobs
            if not req.only_non_expired or j.get("liveness_status") != "expired"
        ]

    targets = targets[: req.limit]
    semaphore = asyncio.Semaphore(5)

    async def _check_one(job: Dict[str, Any]) -> Dict[str, Any]:
        job_id = int(job.get("id", 0))
        async with semaphore:
            res = await LivenessService.check_liveness(job.get("url", ""))
        now_iso = datetime.now(timezone.utc).isoformat()
        job["liveness_status"] = res["status"]
        job["liveness_reason"] = res.get("reason")
        job["liveness_checked_at"] = now_iso

        app = await firebase_manager.get_application(user_id, job_id)
        if app and res["status"] == "expired" and app.get("status") == "disponivel":
            app["status"] = "descartada"
            app["notes"] = ((app.get("notes") or "") + f" [Auto-descartada: {res.get('reason')}]").strip()
            await firebase_manager.save_application(user_id, job_id, app)

        await firebase_manager.save_job(user_id, job)
        return {
            "job_id": job_id,
            "liveness_status": job["liveness_status"],
            "liveness_reason": job["liveness_reason"]
        }

    results = await asyncio.gather(*[_check_one(j) for j in targets])
    summary = {
        "checked": len(results),
        "active": sum(1 for r in results if r["liveness_status"] == "active"),
        "expired": sum(1 for r in results if r["liveness_status"] == "expired"),
        "uncertain": sum(1 for r in results if r["liveness_status"] not in ("active", "expired")),
        "results": results
    }
    return summary


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    rj = await firebase_manager.get_job(user_id, job_id)
    if not rj:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")
    return _to_job_response(rj, fallback_id=job_id)


@router.post("/{job_id}/check-liveness")
async def check_job_liveness(job_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    rj = await firebase_manager.get_job(user_id, job_id)
    if not rj:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    check_res = await LivenessService.check_liveness(rj.get("url", ""))
    now_iso = datetime.now(timezone.utc).isoformat()

    rj["liveness_status"] = check_res["status"]
    rj["liveness_reason"] = check_res.get("reason")
    rj["liveness_checked_at"] = now_iso

    app = await firebase_manager.get_application(user_id, job_id)
    if app and check_res["status"] == "expired" and app.get("status") == "disponivel":
        app["status"] = "descartada"
        app["notes"] = ((app.get("notes") or "") + f" [Auto-descartada: {check_res.get('reason')}]").strip()
        await firebase_manager.save_application(user_id, job_id, app)

    await firebase_manager.save_job(user_id, rj)

    return {
        "job_id": job_id,
        "liveness_status": rj["liveness_status"],
        "liveness_reason": rj["liveness_reason"],
        "liveness_checked_at": rj["liveness_checked_at"]
    }


@router.delete("/{job_id}")
async def delete_job(job_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    await firebase_manager.delete_job(user_id, job_id)
    return {"status": "success", "message": "Vaga removida com sucesso do Firebase"}
