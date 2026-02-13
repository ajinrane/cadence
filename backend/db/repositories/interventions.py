"""
Intervention repository — log + list + stats.
"""

import uuid
from datetime import datetime, timedelta

from .base import BaseRepository


class InterventionRepository(BaseRepository):

    async def log(self, patient_id: str, type: str, outcome: str = "pending",
                  notes: str = "", triggered_by: str = "manual") -> dict:
        """Log a new intervention. Looks up site_id/trial_id from patient."""
        patient = await self._fetchrow(
            "SELECT site_id, trial_id FROM patients WHERE patient_id = $1", patient_id
        )
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        intv_id = f"int_{uuid.uuid4().hex[:8]}"
        row = await self._fetchrow(
            """INSERT INTO interventions (id, patient_id, site_id, trial_id, type, date, outcome, notes, triggered_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *""",
            intv_id, patient_id, patient["site_id"], patient["trial_id"],
            type, datetime.now().date(), outcome, notes, triggered_by,
        )
        return self._format(row)

    async def list_interventions(self, site_id: str = None, patient_id: str = None,
                                 trial_id: str = None) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)
            i += 1
        if patient_id:
            conditions.append(f"patient_id = ${i}")
            args.append(patient_id)
            i += 1
        if trial_id:
            conditions.append(f"trial_id = ${i}")
            args.append(trial_id)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        rows = await self._fetch(
            f"SELECT * FROM interventions {where} ORDER BY date DESC", *args
        )
        return [self._format(r) for r in rows]

    async def stats(self, site_id: str = None) -> dict:
        """Intervention effectiveness stats."""
        condition = "WHERE site_id = $1" if site_id else ""
        args = [site_id] if site_id else []

        rows = await self._fetch(
            f"""SELECT type, outcome, count(*) as cnt
                FROM interventions {condition}
                GROUP BY type, outcome""",
            *args,
        )

        by_type = {}
        by_outcome = {}
        total = 0

        for r in rows:
            t = r["type"]
            o = r["outcome"]
            c = r["cnt"]
            total += c

            by_type.setdefault(t, {"total": 0, "positive": 0})
            by_type[t]["total"] += c
            if o == "positive":
                by_type[t]["positive"] += c

            by_outcome.setdefault(o, 0)
            by_outcome[o] += c

        # Compute success rates
        success_rates = {}
        for t, v in by_type.items():
            success_rates[t] = round(v["positive"] / max(v["total"], 1) * 100, 1)

        # This week count
        week_ago = (datetime.now() - timedelta(days=7)).date()
        week_condition = f"WHERE date >= $1" + (f" AND site_id = $2" if site_id else "")
        week_args = [week_ago] + ([site_id] if site_id else [])
        this_week = await self._fetchval(
            f"SELECT count(*) FROM interventions {week_condition}", *week_args
        )

        system_total = await self._fetchval(
            f"SELECT count(*) FROM interventions WHERE triggered_by = 'system_recommendation'"
            + (f" AND site_id = $1" if site_id else ""),
            *args,
        )
        system_positive = await self._fetchval(
            f"SELECT count(*) FROM interventions WHERE triggered_by = 'system_recommendation' AND outcome = 'positive'"
            + (f" AND site_id = $1" if site_id else ""),
            *args,
        )

        return {
            "total": total,
            "by_outcome": by_outcome,
            "by_type": success_rates,
            "system_success_rate": round(system_positive / max(system_total, 1) * 100, 1),
            "this_week": this_week,
        }

    async def list_all(self) -> list[dict]:
        rows = await self._fetch("SELECT * FROM interventions ORDER BY date")
        return [self._format(r) for r in rows]

    def _format(self, row: dict) -> dict:
        intv = dict(row)
        if intv.get("date") is not None:
            intv["date"] = str(intv["date"])
        intv.pop("created_at", None)
        return intv
