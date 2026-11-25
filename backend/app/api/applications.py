import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from backend.app.auth_utils import get_current_user
from backend.app.firebase import firebase_manager
from backend.app.schemas.application import ApplicationResponse, ApplicationUpdate
from backend.app.security import decrypt_secret
from backend.app.services.discord_notifier import DiscordNotificationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


def _to_application_response(res: Dict[str, Any], job_id: int, fallback_now: str) -> ApplicationResponse:
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
        created_at=res.get("created_at") or fallback_now,
        updated_at=res.get("updated_at") or fallback_now
    )


@router.get("/stats")
async def get_application_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Summary metrics of the job hunting pipeline scoped to current user."""
    return await firebase_manager.get_stats(current_user["id"])


@router.post("/{job_id}/apply")
async def mark_applied(job_id: int, notes: str = "", current_user: Dict[str, Any] = Depends(get_current_user)):
    """Fast action: Mark 'Já me candidatei'."""
    user_id = current_user["id"]
    job = await firebase_manager.get_job(user_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada.")

    app = await firebase_manager.get_application(user_id, job_id) or {}
    now = datetime.now(timezone.utc).isoformat()

    app["status"] = "candidatado"
    app["applied_at"] = now
    if notes:
        app["notes"] = notes

    await firebase_manager.save_application(user_id, job_id, app)
    return {"status": "success", "message": "Marcado como candidatado!", "data": app}


@router.patch("/{job_id}", response_model=ApplicationResponse)
async def update_application(
    job_id: int,
    update_data: ApplicationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    job = await firebase_manager.get_job(user_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada.")

    app = await firebase_manager.get_application(user_id, job_id) or {}
    prev_status = app.get("status", "disponivel")
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

    res = await firebase_manager.save_application(user_id, job_id, app)

    new_status = res.get("status")
    if new_status != prev_status and new_status in ("entrevista", "positiva"):
        try:
            user_settings = await firebase_manager.get_user_settings(user_id)
            if user_settings.get("discord_notify_on_status_change", True):
                webhook_url = decrypt_secret(user_settings.get("discord_webhook_url"))
                if webhook_url:
                    await DiscordNotificationService.send_status_change_notification(
                        webhook_url=webhook_url,
                        job_title=job.get("title", "Vaga"),
                        company=job.get("company", "Empresa"),
                        new_status=new_status,
                        job_url=job.get("url")
                    )
        except Exception as e:
            logger.warning(f"Aviso ao notificar mudança de status no Discord: {e}")

    return _to_application_response(res, job_id, now)
