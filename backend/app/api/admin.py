from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from backend.app.auth_utils import decode_access_token, verify_password, create_access_token
from backend.app.config import settings
from backend.app.firebase import firebase_manager

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

_ADMIN_TOKEN_HOURS = 8


# ── Schemas ────────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Auth guard ─────────────────────────────────────────────────────────────────

def _require_admin(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação de administrador necessária.",
        )
    token = authorization.split(" ", 1)[1].strip()
    decoded = decode_access_token(token)
    if not decoded or decoded.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso reservado ao administrador.",
        )
    return decoded


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(req: AdminLoginRequest) -> AdminLoginResponse:
    """Authenticate admin with credentials stored in .env (hashed password)."""
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Painel de administração não configurado.",
        )
    if req.email.strip().lower() != settings.ADMIN_EMAIL.strip().lower():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")
    if not verify_password(req.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas.")

    token = create_access_token(
        {"sub": "admin", "role": "admin"},
        expires_delta=timedelta(hours=_ADMIN_TOKEN_HOURS),
    )
    return AdminLoginResponse(access_token=token)


@router.get("/users")
async def admin_list_users(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Return all registered users (safe fields only — no password hashes)."""
    _require_admin(authorization)
    users = await firebase_manager.list_all_users()
    users.sort(key=lambda u: str(u.get("created_at") or ""), reverse=True)
    return {"users": users, "total": len(users)}


@router.get("/metrics")
async def admin_metrics(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Return platform-wide aggregated metrics."""
    _require_admin(authorization)
    return await firebase_manager.get_platform_metrics()
