from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime, timezone

from backend.app.schemas.application import ApplicationUpdate, ApplicationResponse
from backend.app.firebase import firebase_manager

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("/stats")
async def get_application_stats():
    """Summary metrics of the job hunting pipeline from Firebase."""
    return await firebase_manager.get_stats()

@router.post("/{job_id}/apply")
async def mark_applied(job_id: int, notes: str = ""):
    """Fast action: Mark 'Já me candidatei' in Firebase."""
    app = await firebase_manager.get_application(job_id) or {}
    now = datetime.now(timezone.utc).isoformat()
    
    app["status"] = "candidatado"
    app["applied_at"] = now
    if notes:
        app["notes"] = notes

    await firebase_manager.save_application(job_id, app)
    return {"status": "success", "message": "Marcado como candidatado no Firebase!", "data": app}

@router.patch("/{job_id}", response_model=ApplicationResponse)
async def update_application(job_id: int, update_data: ApplicationUpdate):
    app = await firebase_manager.get_application(job_id) or {}
    now = datetime.now(timezone.utc).isoformat()
    
    if update_data.status is not None:
        app["status"] = update_data.status
        if update_data.status == "candidatado" and not app.get("applied_at"):
            app["applied_at"] = now
    if update_data.notes is not None:
        app["notes"] = update_data.notes
    if update_data.feedback_notes is not None:
        app["feedback_notes"] = update_data.feedback_notes
        app["feedback_received_at"] = now
    if update_data.custom_cv_text is not None:
        app["custom_cv_text"] = update_data.custom_cv_text
    if update_data.custom_cover_letter is not None:
        app["custom_cover_letter"] = update_data.custom_cover_letter

    res = await firebase_manager.save_application(job_id, app)

    return ApplicationResponse(
        id=int(res.get("id") or job_id),
        job_id=job_id,
        status=res.get("status", "disponivel"),
        match_score=res.get("match_score"),
        match_summary=res.get("match_summary"),
        pros=res.get("pros"),
        gaps=res.get("gaps"),
        applied_at=res.get("applied_at"),
        custom_cv_path=res.get("custom_cv_path"),
        custom_cover_letter=res.get("custom_cover_letter"),
        custom_cv_text=res.get("custom_cv_text"),
        notes=res.get("notes"),
        feedback_received_at=res.get("feedback_received_at"),
        feedback_notes=res.get("feedback_notes"),
        created_at=res.get("created_at") or now,
        updated_at=res.get("updated_at") or now
    )
