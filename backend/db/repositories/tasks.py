"""
Task repository — CRUD for tasks.
"""

import uuid
from datetime import datetime, timedelta

from .base import BaseRepository


class TaskRepository(BaseRepository):

    async def list_tasks(self, site_id: str = None, start_date: str = None,
                         end_date: str = None, status: str = None,
                         category: str = None, patient_id: str = None) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)
            i += 1
        if start_date:
            conditions.append(f"due_date >= ${i}")
            args.append(datetime.strptime(start_date, "%Y-%m-%d").date())
            i += 1
        if end_date:
            conditions.append(f"due_date <= ${i}")
            args.append(datetime.strptime(end_date, "%Y-%m-%d").date())
            i += 1
        if status:
            conditions.append(f"status = ${i}")
            args.append(status)
            i += 1
        if category:
            conditions.append(f"category = ${i}")
            args.append(category)
            i += 1
        if patient_id:
            conditions.append(f"patient_id = ${i}")
            args.append(patient_id)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        rows = await self._fetch(
            f"""SELECT * FROM tasks {where}
                ORDER BY
                  CASE priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                  END,
                  due_date ASC""",
            *args,
        )
        return [self._format_task(r) for r in rows]

    async def get_task(self, task_id: str) -> dict | None:
        row = await self._fetchrow("SELECT * FROM tasks WHERE id = $1", task_id)
        return self._format_task(row) if row else None

    async def create_task(self, data: dict) -> dict:
        task_id = data.get("id") or f"task_{uuid.uuid4().hex[:8]}"
        due_date = data["due_date"]
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, "%Y-%m-%d").date()

        row = await self._fetchrow(
            """INSERT INTO tasks (id, title, description, patient_id, trial_id, site_id,
               due_date, priority, status, category, created_by, assigned_to)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *""",
            task_id, data["title"], data.get("description", ""),
            data.get("patient_id"), data.get("trial_id"), data["site_id"],
            due_date, data.get("priority", "normal"),
            data.get("status", "pending"), data.get("category", "documentation"),
            data.get("created_by", "system"), data.get("assigned_to"),
        )
        return self._format_task(row)

    async def update_task(self, task_id: str, updates: dict) -> dict | None:
        fields = []
        args = []
        i = 1
        allowed = ("title", "description", "priority", "status", "category",
                    "assigned_to", "due_date", "completed_date", "snoozed_until")
        for key in allowed:
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                val = updates[key]
                if key in ("due_date", "completed_date", "snoozed_until") and isinstance(val, str):
                    val = datetime.strptime(val, "%Y-%m-%d").date()
                args.append(val)
                i += 1

        if not fields:
            return await self.get_task(task_id)

        args.append(task_id)
        await self._execute(
            f"UPDATE tasks SET {', '.join(fields)} WHERE id = ${i}", *args
        )
        return await self.get_task(task_id)

    async def complete_task(self, task_id: str) -> dict | None:
        return await self.update_task(task_id, {
            "status": "completed",
            "completed_date": datetime.now().strftime("%Y-%m-%d"),
        })

    async def snooze_task(self, task_id: str, days: int = 1) -> dict | None:
        snoozed = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        return await self.update_task(task_id, {"snoozed_until": snoozed})

    async def bulk_insert(self, tasks: list[dict]) -> int:
        """Insert multiple tasks. Returns count inserted."""
        count = 0
        for t in tasks:
            try:
                await self.create_task(t)
                count += 1
            except Exception:
                pass
        return count

    async def list_all(self) -> list[dict]:
        """Load all tasks for facade preload."""
        rows = await self._fetch("SELECT * FROM tasks ORDER BY due_date")
        return [self._format_task(r) for r in rows]

    async def count(self, site_id: str = None) -> int:
        if site_id:
            return await self._fetchval(
                "SELECT count(*) FROM tasks WHERE site_id = $1", site_id
            )
        return await self._fetchval("SELECT count(*) FROM tasks")

    def _format_task(self, row: dict) -> dict:
        t = dict(row)
        for key in ("due_date", "completed_date", "snoozed_until"):
            if t.get(key) is not None:
                t[key] = str(t[key])
        t.pop("created_at", None)
        return t
