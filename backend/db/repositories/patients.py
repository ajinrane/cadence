"""
Patient repository — patients, events, notes.
JOINs trials + sites for trial_name/site_name (not stored in patients table).
"""

import uuid
from datetime import datetime

from .base import BaseRepository


class PatientRepository(BaseRepository):

    async def list_patients(self, site_id: str = None, trial_id: str = None,
                            risk_level: str = None, status: str = None,
                            sort_by: str = None, limit: int = None) -> list[dict]:
        """List patients with optional filters. Returns flat records (no events/notes)."""
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"p.site_id = ${i}")
            args.append(site_id)
            i += 1
        if trial_id:
            conditions.append(f"p.trial_id = ${i}")
            args.append(trial_id)
            i += 1
        if status:
            conditions.append(f"p.status = ${i}")
            args.append(status)
            i += 1
        if risk_level:
            if risk_level == "high":
                conditions.append("p.dropout_risk_score >= 0.7")
            elif risk_level == "medium":
                conditions.append("p.dropout_risk_score >= 0.4 AND p.dropout_risk_score < 0.7")
            elif risk_level == "low":
                conditions.append("p.dropout_risk_score < 0.4")

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        order = "p.dropout_risk_score DESC"
        if sort_by == "name":
            order = "p.name"
        elif sort_by == "enrollment_date":
            order = "p.enrollment_date DESC"
        elif sort_by == "next_visit":
            order = "p.next_visit_date ASC NULLS LAST"

        limit_clause = f"LIMIT ${i}" if limit else ""
        if limit:
            args.append(limit)

        rows = await self._fetch(
            f"""SELECT p.*, t.name AS trial_name, s.name AS site_name
                FROM patients p
                JOIN trials t ON p.trial_id = t.trial_id
                JOIN sites s ON p.site_id = s.site_id
                {where}
                ORDER BY {order}
                {limit_clause}""",
            *args,
        )
        return [self._format_patient(r) for r in rows]

    async def get_patient(self, patient_id: str) -> dict | None:
        """Get single patient with events, notes, interventions."""
        row = await self._fetchrow(
            """SELECT p.*, t.name AS trial_name, s.name AS site_name
               FROM patients p
               JOIN trials t ON p.trial_id = t.trial_id
               JOIN sites s ON p.site_id = s.site_id
               WHERE p.patient_id = $1""",
            patient_id,
        )
        if not row:
            return None

        patient = self._format_patient(row)

        # Fetch events
        events = await self._fetch(
            "SELECT type, date, note FROM patient_events WHERE patient_id = $1 ORDER BY date",
            patient_id,
        )
        patient["events"] = [
            {"type": e["type"], "date": str(e["date"]), "note": e["note"]}
            for e in events
        ]

        # Fetch notes
        notes = await self._fetch(
            "SELECT id, author, content, timestamp, category FROM patient_notes WHERE patient_id = $1 ORDER BY timestamp DESC",
            patient_id,
        )
        patient["notes"] = [
            {"id": n["id"], "author": n["author"], "content": n["content"],
             "timestamp": str(n["timestamp"]), "category": n["category"]}
            for n in notes
        ]

        # Fetch interventions
        interventions = await self._fetch(
            "SELECT * FROM interventions WHERE patient_id = $1 ORDER BY date DESC",
            patient_id,
        )
        patient["interventions"] = [self._format_intervention(intv) for intv in interventions]

        return patient

    async def add_note(self, patient_id: str, content: str, author: str = "CRC",
                       category: str = "general", site_id: str = None) -> dict:
        """Add a note to a patient. Embeds content if embeddings available."""
        if not site_id:
            site_id = await self._fetchval(
                "SELECT site_id FROM patients WHERE patient_id = $1", patient_id
            )

        note_id = f"note_{uuid.uuid4().hex[:8]}"
        embedding = None
        if self.embeddings:
            try:
                vec = await self.embeddings.embed(content)
                embedding = self.embeddings.to_pgvector(vec)
            except Exception:
                pass

        await self._execute(
            """INSERT INTO patient_notes (id, patient_id, site_id, author, content, category, embedding)
               VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            note_id, patient_id, site_id, author, content, category, embedding,
        )

        return {
            "id": note_id,
            "patient_id": patient_id,
            "site_id": site_id,
            "author": author,
            "content": content,
            "category": category,
            "timestamp": datetime.now().isoformat(),
        }

    async def update_patient(self, patient_id: str, updates: dict) -> dict | None:
        """Update specific patient fields."""
        fields = []
        args = []
        i = 1
        allowed = (
            "status", "dropout_risk_score", "risk_factors", "recommended_actions",
            "next_visit_date", "visits_completed", "visits_missed", "last_contact_date",
            "phone", "primary_crc_id",
        )
        for key in allowed:
            if key in updates and updates[key] is not None:
                fields.append(f"{key} = ${i}")
                val = updates[key]
                # Convert date strings to date objects
                if key in ("next_visit_date", "last_contact_date") and isinstance(val, str):
                    val = datetime.strptime(val, "%Y-%m-%d").date()
                args.append(val)
                i += 1

        if not fields:
            return await self.get_patient(patient_id)

        args.append(patient_id)
        await self._execute(
            f"UPDATE patients SET {', '.join(fields)} WHERE patient_id = ${i}",
            *args,
        )
        return await self.get_patient(patient_id)

    async def list_all(self) -> list[dict]:
        """Load all patients for facade preload. Reconstructs full dicts with events/notes/interventions."""
        patients = await self._fetch(
            """SELECT p.*, t.name AS trial_name, s.name AS site_name
               FROM patients p
               JOIN trials t ON p.trial_id = t.trial_id
               JOIN sites s ON p.site_id = s.site_id
               ORDER BY p.patient_id"""
        )

        # Batch-fetch all events, notes, interventions
        all_events = await self._fetch(
            "SELECT * FROM patient_events ORDER BY patient_id, date"
        )
        all_notes = await self._fetch(
            "SELECT * FROM patient_notes ORDER BY patient_id, timestamp DESC"
        )
        all_interventions = await self._fetch(
            "SELECT * FROM interventions ORDER BY patient_id, date"
        )

        # Group by patient_id
        events_by_pid = {}
        for e in all_events:
            events_by_pid.setdefault(e["patient_id"], []).append(
                {"type": e["type"], "date": str(e["date"]), "note": e["note"]}
            )

        notes_by_pid = {}
        for n in all_notes:
            notes_by_pid.setdefault(n["patient_id"], []).append(
                {"id": n["id"], "author": n["author"], "content": n["content"],
                 "timestamp": str(n["timestamp"]), "category": n["category"]}
            )

        interventions_by_pid = {}
        for intv in all_interventions:
            interventions_by_pid.setdefault(intv["patient_id"], []).append(
                self._format_intervention(intv)
            )

        result = []
        for p in patients:
            patient = self._format_patient(p)
            pid = patient["patient_id"]
            patient["events"] = events_by_pid.get(pid, [])
            patient["notes"] = notes_by_pid.get(pid, [])
            patient["interventions"] = interventions_by_pid.get(pid, [])
            result.append(patient)

        return result

    async def count(self, site_id: str = None) -> int:
        if site_id:
            return await self._fetchval(
                "SELECT count(*) FROM patients WHERE site_id = $1", site_id
            )
        return await self._fetchval("SELECT count(*) FROM patients")

    def _format_patient(self, row: dict) -> dict:
        """Convert DB row to API-compatible dict."""
        p = dict(row)
        # Convert date objects to strings
        for key in ("enrollment_date", "next_visit_date", "last_contact_date"):
            if p.get(key) is not None:
                p[key] = str(p[key])
        # Remove DB metadata
        p.pop("created_at", None)
        # Ensure arrays default
        if "events" not in p:
            p["events"] = []
        if "notes" not in p:
            p["notes"] = []
        if "interventions" not in p:
            p["interventions"] = []
        return p

    def _format_intervention(self, row: dict) -> dict:
        intv = dict(row)
        if intv.get("date") is not None:
            intv["date"] = str(intv["date"])
        intv.pop("created_at", None)
        return intv
