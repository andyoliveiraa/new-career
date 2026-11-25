import base64
import hashlib
import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from backend.app.config import settings

ENCRYPTED_PREFIX = "enc::"
MASK_TOKEN = "••••"


def _get_fernet() -> Fernet:
    """Build a deterministic Fernet cipher from SETTINGS_ENCRYPTION_KEY or JWT_SECRET."""
    raw_key = (settings.SETTINGS_ENCRYPTION_KEY or "").strip()
    if raw_key:
        try:
            return Fernet(raw_key.encode("utf-8"))
        except Exception:
            digest = hashlib.sha256(raw_key.encode("utf-8")).digest()
            return Fernet(base64.urlsafe_b64encode(digest))

    digest = hashlib.sha256(settings.JWT_SECRET.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(value: Optional[str]) -> Optional[str]:
    """Encrypt a sensitive string for storage at rest."""
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return ""
    if cleaned.startswith(ENCRYPTED_PREFIX):
        return cleaned
    token = _get_fernet().encrypt(cleaned.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_PREFIX}{token}"


def decrypt_secret(value: Optional[str]) -> Optional[str]:
    """Decrypt a stored secret; tolerates legacy plaintext values."""
    if not value:
        return None
    if not value.startswith(ENCRYPTED_PREFIX):
        return value
    token = value[len(ENCRYPTED_PREFIX):]
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None


def mask_secret(value: Optional[str]) -> Optional[str]:
    """Return a non-reversible masked preview of a secret (e.g., 'AIza••••9xYz')."""
    plain = decrypt_secret(value)
    if not plain:
        return None
    if len(plain) <= 8:
        return MASK_TOKEN
    return f"{plain[:4]}{MASK_TOKEN}{plain[-4:]}"


def is_masked_value(value: Optional[str]) -> bool:
    """Check if a client-submitted string is just a masked placeholder."""
    return bool(value and MASK_TOKEN in value)


def safe_join_within(base_dir: str, *parts: str) -> str:
    """Join path segments and verify the result remains strictly inside base_dir."""
    base_abs = os.path.abspath(base_dir)
    target_abs = os.path.abspath(os.path.join(base_abs, *parts))
    if os.path.commonpath([base_abs, target_abs]) != base_abs:
        raise HTTPException(status_code=400, detail="Caminho de ficheiro inválido.")
    return target_abs
