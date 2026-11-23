from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.schemas.job import JobResponse
from backend.app.services.liveness import LivenessService
from backend.app.services.geo_filter import calculate_job_distance

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
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Job, Application.status.label("app_status"), Application.match_score)
        .outerjoin(Application, Job.id == Application.job_id)
        .order_by(desc(Job.created_at))
    )

    conditions = []
    if query:
        q_wild = f"%{query}%"
        conditions.append(or_(Job.title.ilike(q_wild), Job.company.ilike(q_wild), Job.description.ilike(q_wild)))
    if location:
        conditions.append(Job.location.ilike(f"%{location}%"))
    if source:
        conditions.append(Job.source == source)
    if liveness:
        conditions.append(Job.liveness_status == liveness)
    if is_remote is not None:
        conditions.append(Job.is_remote == is_remote)
    if status:
        conditions.append(Application.status == status)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.limit(limit).offset(offset)
    res = await db.execute(stmt)
    rows = res.all()

    output = []
    for job, app_status, match_score in rows:
        job_data = JobResponse(
            id=job.id,
            job_key=job.job_key,
            title=job.title,
            company=job.company,
            location=job.location,
            is_remote=job.is_remote,
            salary=job.salary,
            description=job.description,
            url=job.url,
            source=job.source,
            liveness_status=job.liveness_status,
            liveness_checked_at=job.liveness_checked_at,
            liveness_reason=job.liveness_reason,
            distance_km=job.distance_km,
            published_at=job.published_at,
            created_at=job.created_at,
            updated_at=job.updated_at,
            application_status=app_status or "disponivel",
            match_score=match_score
        )
        output.append(job_data)

    return output

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Job, Application.status.label("app_status"), Application.match_score)
        .outerjoin(Application, Job.id == Application.job_id)
        .where(Job.id == job_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    job, app_status, match_score = row
    return JobResponse(
        id=job.id,
        job_key=job.job_key,
        title=job.title,
        company=job.company,
        location=job.location,
        is_remote=job.is_remote,
        salary=job.salary,
        description=job.description,
        url=job.url,
        source=job.source,
        liveness_status=job.liveness_status,
        liveness_checked_at=job.liveness_checked_at,
        liveness_reason=job.liveness_reason,
        distance_km=job.distance_km,
        published_at=job.published_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        application_status=app_status or "disponivel",
        match_score=match_score
    )

@router.post("/{job_id}/check-liveness")
async def check_job_liveness(job_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    check_res = await LivenessService.check_liveness(job.url)
    job.liveness_status = check_res["status"]
    job.liveness_reason = check_res.get("reason")
    job.liveness_checked_at = check_res["checked_at"]
    
    # If expired and an application exists, mark or update
    app_stmt = select(Application).where(Application.job_id == job_id)
    app_res = await db.execute(app_stmt)
    app = app_res.scalar_one_or_none()
    if app and check_res["status"] == "expired" and app.status == "disponivel":
        app.status = "descartada"
        app.notes = (app.notes or "") + f" [Auto-descartada: {check_res.get('reason')}]"

    await db.commit()
    await db.refresh(job)

    return {
        "job_id": job.id,
        "liveness_status": job.liveness_status,
        "liveness_reason": job.liveness_reason,
        "liveness_checked_at": job.liveness_checked_at
    }

@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    
    await db.delete(job)
    await db.commit()
    return {"status": "success", "message": "Vaga removida com sucesso"}
