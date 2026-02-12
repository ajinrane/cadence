"""
Authentication module for Cadence.
Minimal JWT-based auth with in-memory user store.
Only enforced on /api/admin/* routes — existing CRC endpoints stay public.
"""

import hashlib
import uuid
import jwt
from datetime import datetime, timedelta
from fastapi import Request, HTTPException

JWT_SECRET = "cadence-dev-secret-change-in-prod"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# -- User store (in-memory, seeded at startup) --------------------------------

users: list[dict] = []


def hash_password(password: str) -> str:
    """SHA-256 hash. Adequate for dev seed data. Use bcrypt in production."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def init_users():
    """Seed default users. Called from lifespan in main.py."""
    global users
    users = [
        {
            "id": "user_admin",
            "email": "admin@cadence.health",
            "name": "Admin",
            "role": "admin",
            "site_id": None,
            "organization_id": None,
            "active": True,
            "password_hash": hash_password("cadence123"),
            "first_login": False,
            "preferences": {},
            "onboarded_tabs": [],
        },
        {
            "id": "user_crc_columbia",
            "email": "crc@columbia.edu",
            "name": "CRC Columbia",
            "role": "crc",
            "site_id": "site_columbia",
            "organization_id": "org_columbia",
            "active": True,
            "password_hash": hash_password("cadence123"),
            "first_login": False,
            "preferences": {},
            "onboarded_tabs": [],
        },
        {
            "id": "user_crc_va",
            "email": "crc@va.gov",
            "name": "CRC VA",
            "role": "crc",
            "site_id": "site_va_lb",
            "organization_id": "org_va_lb",
            "active": True,
            "password_hash": hash_password("cadence123"),
            "first_login": False,
            "preferences": {},
            "onboarded_tabs": [],
        },
        {
            "id": "user_crc_sinai",
            "email": "crc@sinai.edu",
            "name": "CRC Sinai",
            "role": "crc",
            "site_id": "site_sinai",
            "organization_id": "org_sinai",
            "active": True,
            "password_hash": hash_password("cadence123"),
            "first_login": False,
            "preferences": {},
            "onboarded_tabs": [],
        },
    ]


# -- JWT helpers ---------------------------------------------------------------

def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "site_id": user.get("site_id"),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# -- FastAPI dependencies ------------------------------------------------------

def _extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def get_current_user(request: Request) -> dict | None:
    """Optional auth — returns user dict or None. No 401 if missing."""
    token = _extract_token(request)
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user = next((u for u in users if u["id"] == payload["sub"] and u["active"]), None)
    if not user:
        return None
    return _safe_user(user)


def require_admin(request: Request) -> dict:
    """Strict auth — returns user or raises 401/403."""
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = next((u for u in users if u["id"] == payload["sub"] and u["active"]), None)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["role"] not in ("admin", "sponsor"):
        raise HTTPException(status_code=403, detail="Admin or sponsor role required")
    return _safe_user(user)


# -- Auth operations -----------------------------------------------------------

def authenticate(email: str, password: str) -> dict | None:
    """Validate credentials. Returns user (without password_hash) or None."""
    user = next((u for u in users if u["email"] == email and u["active"]), None)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return _safe_user(user)


def list_users() -> list[dict]:
    return [_safe_user(u) for u in users]


def create_user(data: dict) -> dict:
    user = {
        "id": f"user_{uuid.uuid4().hex[:8]}",
        "email": data["email"],
        "name": data["name"],
        "role": data.get("role", "crc"),
        "site_id": data.get("site_id"),
        "organization_id": data.get("organization_id"),
        "active": True,
        "password_hash": hash_password(data.get("password", "cadence123")),
        "first_login": data.get("first_login", True),
        "preferences": {},
        "onboarded_tabs": [],
    }
    users.append(user)
    return _safe_user(user)


def update_user(user_id: str, updates: dict) -> dict | None:
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return None
    for key in ("name", "email", "role", "site_id", "organization_id", "active", "first_login", "preferences", "onboarded_tabs"):
        if key in updates and updates[key] is not None:
            user[key] = updates[key]
    if "password" in updates and updates["password"]:
        user["password_hash"] = hash_password(updates["password"])
    return _safe_user(user)


def delete_user(user_id: str) -> bool:
    """Soft delete — sets active=False."""
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return False
    user["active"] = False
    return True


def _safe_user(user: dict) -> dict:
    """Strip password_hash from user dict."""
    return {k: v for k, v in user.items() if k != "password_hash"}
