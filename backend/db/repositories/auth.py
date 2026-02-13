"""
Auth/user repository — CRUD for users.
"""

import uuid

from .base import BaseRepository


class AuthRepository(BaseRepository):

    async def list_users(self) -> list[dict]:
        """List users without password_hash."""
        rows = await self._fetch("SELECT * FROM users WHERE active = TRUE ORDER BY name")
        return [self._safe(r) for r in rows]

    async def get_user(self, user_id: str) -> dict | None:
        row = await self._fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return self._safe(row) if row else None

    async def get_user_by_email(self, email: str) -> dict | None:
        """Get user including password_hash (for authentication)."""
        row = await self._fetchrow("SELECT * FROM users WHERE email = $1", email)
        return dict(row) if row else None

    async def create_user(self, data: dict) -> dict:
        user_id = data.get("id") or f"user_{uuid.uuid4().hex[:8]}"
        row = await self._fetchrow(
            """INSERT INTO users (id, email, name, role, site_id, organization_id,
               active, password_hash, first_login, preferences, onboarded_tabs)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *""",
            user_id, data["email"], data["name"],
            data.get("role", "crc"), data.get("site_id"),
            data.get("organization_id"), data.get("active", True),
            data["password_hash"], data.get("first_login", True),
            data.get("preferences", {}), data.get("onboarded_tabs", []),
        )
        return self._safe(row)

    async def update_user(self, user_id: str, updates: dict) -> dict | None:
        fields = []
        args = []
        i = 1
        for key in ("name", "email", "role", "site_id", "organization_id",
                     "active", "first_login", "preferences", "onboarded_tabs",
                     "password_hash"):
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                args.append(updates[key])
                i += 1

        if not fields:
            return await self.get_user(user_id)

        args.append(user_id)
        await self._execute(
            f"UPDATE users SET {', '.join(fields)} WHERE id = ${i}", *args
        )
        return await self.get_user(user_id)

    async def delete_user(self, user_id: str) -> bool:
        """Soft delete — sets active=False."""
        result = await self._execute(
            "UPDATE users SET active = FALSE WHERE id = $1", user_id
        )
        return result == "UPDATE 1"

    async def list_all_users(self) -> list[dict]:
        """Load all users WITH password_hash (for auth.py in-memory compat)."""
        rows = await self._fetch("SELECT * FROM users ORDER BY name")
        return [dict(r) for r in rows]

    def _safe(self, row: dict) -> dict:
        """Strip password_hash and DB metadata."""
        if not row:
            return row
        r = dict(row)
        r.pop("password_hash", None)
        r.pop("created_at", None)
        return r
