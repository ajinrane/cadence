"""
Monitoring visit repository — visits + JSONB checklists.
"""

import uuid
from datetime import datetime

from .base import BaseRepository


class MonitoringRepository(BaseRepository):

    async def list_visits(self, site_id: str = None) -> list[dict]:
        if site_id:
            rows = await self._fetch(
                "SELECT * FROM monitoring_visits WHERE site_id = $1 ORDER BY scheduled_date DESC",
                site_id,
            )
        else:
            rows = await self._fetch(
                "SELECT * FROM monitoring_visits ORDER BY scheduled_date DESC"
            )
        return [self._format(r) for r in rows]

    async def get_visit(self, visit_id: str) -> dict | None:
        row = await self._fetchrow(
            "SELECT * FROM monitoring_visits WHERE id = $1", visit_id
        )
        return self._format(row) if row else None

    async def create_visit(self, site_id: str, monitor_name: str,
                           scheduled_date: str, status: str = "upcoming") -> dict:
        visit_id = f"mon_{uuid.uuid4().hex[:8]}"
        row = await self._fetchrow(
            """INSERT INTO monitoring_visits (id, site_id, monitor_name, scheduled_date, status, checklist)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
            visit_id, site_id, monitor_name,
            datetime.strptime(scheduled_date, "%Y-%m-%d").date(),
            status, [],
        )
        return self._format(row)

    async def update_checklist(self, visit_id: str, checklist: list) -> dict | None:
        """Replace full checklist JSONB."""
        await self._execute(
            "UPDATE monitoring_visits SET checklist = $1 WHERE id = $2",
            checklist, visit_id,
        )
        return await self.get_visit(visit_id)

    async def update_checklist_item(self, visit_id: str, item_id: str, updates: dict) -> dict | None:
        """Update a single checklist item by its id within the JSONB array."""
        visit = await self.get_visit(visit_id)
        if not visit:
            return None

        checklist = visit.get("checklist", [])
        for item in checklist:
            if item.get("id") == item_id:
                item.update(updates)
                break

        return await self.update_checklist(visit_id, checklist)

    async def list_all(self) -> list[dict]:
        rows = await self._fetch(
            "SELECT * FROM monitoring_visits ORDER BY scheduled_date"
        )
        return [self._format(r) for r in rows]

    def _format(self, row: dict) -> dict:
        v = dict(row)
        if v.get("scheduled_date") is not None:
            v["scheduled_date"] = str(v["scheduled_date"])
        v.pop("created_at", None)
        return v
