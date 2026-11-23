from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.schemas.application import ApplicationUpdate, ApplicationResponse

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("/stats")
async def get_application_stats(db: AsyncSession = Depends(get_db)):
    """Summary metrics of the job hunting pipeline."""
    stmt = select(Application.status, func.count(Application.id)).group_by(Application.status)
    res = await db.execute(stmt)
    counts = dict(res.all())
    
    total_jobs_res = await db.execute(select(func.count(Job.id)))
    total_jobs = total_jobs_res.scalar() or 0

    return {
        "total_jobs": total_jobs,
        "disponivel": counts.get("disponivel", 0),
        "avaliada": counts.get("avaliada", 0),
        "em_preparacao": counts.get("em_preparacao", 0),
        "candidatado": counts.get("candidatado", 0),
        "entrevista": counts.get("entrevista", 0),
        "positiva": counts.get("positiva", 0),
        "negativa": counts.get("negativa", 0),
        "descartada": counts.get("descartada", 0)
    }

@router.post("/{job_id}/apply")
async def mark_applied(job_id: int, notes: str = "", db: AsyncSession = Depends(get_db)):
    """Fast action: Mark 'Já me candidatei'."""
    stmt = select(Application).where(Application.job_id == job_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    now = datetime.now(timezone.utc)
    if not app:
        app = Application(
            job_id=job_id,
            status="candidatado",
            applied_at=now,
            notes=notes
        )
        db.add(app)
    else:
        app.status = "candidatado"
        app.applied_at = now
        if notes:
            app.notes = notes

    await db.commit()
    await db.refresh(app)
    return {"status": "success", "message": "Marcado como candidatado!", "data": app}

@router.patch("/{job_id}", response_model=ApplicationResponse)
async def update_application(job_id: int, update_data: ApplicationUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Application).where(Application.job_id == job_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app:
        app = Application(job_id=job_id, status=update_data.status or "disponivel")
        db.add(app)
    
    if update_data.status is not None:
        app.status = update_data.status
        if update_data.status == "candidatado" and not app.applied_at:
            app.applied_at = datetime.now(timezone.utc)
    if update_data.notes is not None:
        app.notes = update_data.notes
    if update_data.feedback_notes is not None:
        app.feedback_notes = update_data.feedback_notes
        app.feedback_received_at = datetime.now(timezone.utc)
    if update_data.custom_cv_text is not None:
        app.custom_cv_text = update_data.custom_cv_text
    if update_data.custom_cover_letter is not None:
        app.custom_cover_letter = update_data.custom_cover_letter

    await db.commit()
    await db.refresh(app)
    return app
