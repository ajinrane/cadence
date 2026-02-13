"""
Staff repository — CRUD for CRC staff.
"""

import uuid

from .base import BaseRepository


class StaffRepository(BaseRepository):

    async def list_staff(self, site_id: str = None, role: str = None) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)
            i += 1
        if role:
            conditions.append(f"role = ${i}")
            args.append(role)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        rows = await self._fetch(f"SELECT * FROM staff {where} ORDER BY name", *args)
        return [self._format(r) for r in rows]

    async def get_staff(self, staff_id: str) -> dict | None:
        row = await self._fetchrow("SELECT * FROM staff WHERE id = $1", staff_id)
        return self._format(row) if row else None

    async def create_staff(self, data: dict) -> dict:
        staff_id = data.get("id") or f"staff_{uuid.uuid4().hex[:8]}"
        row = await self._fetchrow(
            """INSERT INTO staff (id, name, email, role, site_id, active, specialties, max_patient_load)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *""",
            staff_id, data["name"], data["email"], data.get("role", "crc"),
            data["site_id"], data.get("active", True),
            data.get("specialties", []), data.get("max_patient_load", 20),
        )
        return self._format(row)

    async def update_staff(self, staff_id: str, updates: dict) -> dict | None:
        fields = []
        args = []
        i = 1
        for key in ("name", "email", "role", "active", "specialties", "max_patient_load"):
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                args.append(updates[key])
                i += 1

        if not fields:
            return await self.get_staff(staff_id)

        args.append(staff_id)
        await self._execute(
            f"UPDATE staff SET {', '.join(fields)} WHERE id = ${i}", *args
        )
        return await self.get_staff(staff_id)

    async def assign_patient(self, patient_id: str, staff_id: str) -> bool:
        result = await self._execute(
            "UPDATE patients SET primary_crc_id = $1 WHERE patient_id = $2",
            staff_id, patient_id,
        )
        return result == "UPDATE 1"

    async def assign_task(self, task_id: str, staff_id: str) -> bool:
        result = await self._execute(
            "UPDATE tasks SET assigned_to = $1 WHERE id = $2",
            staff_id, task_id,
        )
        return result == "UPDATE 1"

    async def list_all(self) -> list[dict]:
        """Load all staff for facade preload."""
        rows = await self._fetch("SELECT * FROM staff ORDER BY site_id, name")
        return [self._format(r) for r in rows]

    def _format(self, row: dict) -> dict:
        s = dict(row)
        s.pop("created_at", None)
        return s
