from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.schemas.job import JobResponse
from backend.app.services.liveness import LivenessService
from backend.app.firebase import firebase_manager

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    query: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None,
    liveness: Optional[str] = None,
    is_remote: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    raw_jobs = await firebase_manager.list_jobs(
        query=query,
        location=location,
        source=source,
        status=status,
        liveness=liveness,
        is_remote=is_remote,
        limit=limit,
        offset=offset
    )

    output = []
    for rj in raw_jobs:
        output.append(JobResponse(
            id=int(rj.get("id", 0)),
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
            created_at=rj.get("created_at") or datetime.now(timezone.utc),
            updated_at=rj.get("updated_at") or datetime.now(timezone.utc),
            application_status=rj.get("application_status") or "disponivel",
            match_score=rj.get("match_score")
        ))
    return output

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int):
    rj = await firebase_manager.get_job(job_id)
    if not rj:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    return JobResponse(
        id=int(rj.get("id", job_id)),
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
        created_at=rj.get("created_at") or datetime.now(timezone.utc),
        updated_at=rj.get("updated_at") or datetime.now(timezone.utc),
        application_status=rj.get("application_status") or "disponivel",
        match_score=rj.get("match_score")
    )

@router.post("/{job_id}/check-liveness")
async def check_job_liveness(job_id: int):
    rj = await firebase_manager.get_job(job_id)
    if not rj:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    check_res = await LivenessService.check_liveness(rj.get("url", ""))
    now_iso = datetime.now(timezone.utc).isoformat()
    
    rj["liveness_status"] = check_res["status"]
    rj["liveness_reason"] = check_res.get("reason")
    rj["liveness_checked_at"] = now_iso

    app = await firebase_manager.get_application(job_id)
    if app and check_res["status"] == "expired" and app.get("status") == "disponivel":
        app["status"] = "descartada"
        app["notes"] = (app.get("notes") or "") + f" [Auto-descartada: {check_res.get('reason')}]"
        await firebase_manager.save_application(job_id, app)

    await firebase_manager.save_job(rj)

    return {
        "job_id": job_id,
        "liveness_status": rj["liveness_status"],
        "liveness_reason": rj["liveness_reason"],
        "liveness_checked_at": rj["liveness_checked_at"]
    }

@router.delete("/{job_id}")
async def delete_job(job_id: int):
    await firebase_manager.delete_job(job_id)
    return {"status": "success", "message": "Vaga removida com sucesso do Firebase"}
