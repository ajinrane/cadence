"""
Data query repository — list, update, stats.
"""

from datetime import datetime

from .base import BaseRepository


class QueryRepository(BaseRepository):

    async def list_queries(self, site_id: str = None, status: str = None) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)
            i += 1
        if status:
            conditions.append(f"status = ${i}")
            args.append(status)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        rows = await self._fetch(
            f"SELECT * FROM data_queries {where} ORDER BY opened_date DESC", *args
        )
        return [self._format(r) for r in rows]

    async def update_query(self, query_id: str, updates: dict) -> dict | None:
        fields = []
        args = []
        i = 1
        for key in ("status", "assigned_to", "resolved_date"):
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                val = updates[key]
                if key == "resolved_date" and isinstance(val, str):
                    val = datetime.strptime(val, "%Y-%m-%d").date()
                args.append(val)
                i += 1

        if not fields:
            return None

        args.append(query_id)
        await self._execute(
            f"UPDATE data_queries SET {', '.join(fields)} WHERE id = ${i}", *args
        )
        row = await self._fetchrow("SELECT * FROM data_queries WHERE id = $1", query_id)
        return self._format(row) if row else None

    async def stats(self, site_id: str = None) -> dict:
        condition = "WHERE site_id = $1" if site_id else ""
        args = [site_id] if site_id else []

        rows = await self._fetch(
            f"""SELECT status, count(*) as cnt
                FROM data_queries {condition}
                GROUP BY status""",
            *args,
        )

        by_status = {r["status"]: r["cnt"] for r in rows}
        total = sum(by_status.values())

        return {
            "total": total,
            "by_status": by_status,
            "open": by_status.get("open", 0),
            "in_progress": by_status.get("in_progress", 0),
            "resolved": by_status.get("resolved", 0),
        }

    async def list_all(self) -> list[dict]:
        rows = await self._fetch("SELECT * FROM data_queries ORDER BY opened_date")
        return [self._format(r) for r in rows]

    def _format(self, row: dict) -> dict:
        q = dict(row)
        for key in ("opened_date", "resolved_date"):
            if q.get(key) is not None:
                q[key] = str(q[key])
        q.pop("created_at", None)
        return q
