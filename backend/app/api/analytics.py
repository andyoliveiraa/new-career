from typing import Any, Dict, Literal, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel

from backend.app.auth_utils import decode_access_token, get_current_user
from backend.app.firebase import firebase_manager

router = APIRouter(prefix="/analytics", tags=["First-Party Analytics"])

ALLOWED_CLIENT_EVENTS = (
    "page_view_login",
    "page_view_register",
    "page_view_rgpd",
    "page_view_privacy",
    "page_view_onboarding",
    "page_view_dashboard",
    "page_view_jobs",
    "page_view_cv_builder",
    "page_view_scrapers",
    "page_view_profile",
    "page_view_settings",
)


class ClientAnalyticsEvent(BaseModel):
    event: Literal[
        "page_view_login",
        "page_view_register",
        "page_view_rgpd",
        "page_view_privacy",
        "page_view_onboarding",
        "page_view_dashboard",
        "page_view_jobs",
        "page_view_cv_builder",
        "page_view_scrapers",
        "page_view_profile",
        "page_view_settings",
    ]


@router.post("/event")
async def record_first_party_event(
    payload: ClientAnalyticsEvent,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Record privacy-safe first-party navigation metrics without third-party trackers."""
    user_id: Optional[str] = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        decoded = decode_access_token(token)
        if decoded and decoded.get("sub"):
            user_id = str(decoded["sub"])

    await firebase_manager.record_metric(payload.event, user_id=user_id, amount=1)
    return {"recorded": True, "event": payload.event}


@router.post("/heartbeat")
async def user_heartbeat(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update the user's last_seen_at timestamp for real-time presence tracking."""
    now = datetime.now(timezone.utc).isoformat()
    await firebase_manager.update_user(current_user["id"], {"last_seen_at": now})
    return {"ok": True, "ts": now}


@router.get("/summary")
async def get_first_party_summary(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return aggregated first-party metrics for the signed-in user and platform totals."""
    return await firebase_manager.get_metrics_summary(current_user["id"])
