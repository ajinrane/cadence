"""
Database Action Provider (v1)
Executes actions by querying the local database / Supabase.
This is the first implementation. Later, DesktopActionProvider
will implement the same interface but control the screen instead.
"""

from datetime import datetime, timedelta
from typing import Any
from .base import ActionProvider, ActionRequest, ActionResult, ActionType


class DatabaseActionProvider(ActionProvider):
    """v1: All actions resolve to database queries."""

    def __init__(self, db):
        """
        Args:
            db: Database interface (PatientDatabase from data/seed.py)
                In production, this would be a Supabase client.
        """
        self.db = db

    async def execute(self, request: ActionRequest) -> ActionResult:
        handlers = {
            ActionType.QUERY_PATIENTS: self._query_patients,
            ActionType.GET_RISK_SCORES: self._get_risk_scores,
            ActionType.SCHEDULE_VISIT: self._schedule_visit,
            ActionType.LOG_INTERVENTION: self._log_intervention,
            ActionType.SEND_REMINDER: self._send_reminder,
            ActionType.SEARCH_KNOWLEDGE: self._search_knowledge,
            ActionType.GET_TRIAL_INFO: self._get_trial_info,
            ActionType.GET_PATIENT_TIMELINE: self._get_patient_timeline,
        }

        handler = handlers.get(request.action_type)
        if not handler:
            return ActionResult(
                success=False,
                error=f"Unknown action type: {request.action_type}",
            )

        try:
            data = await handler(request.parameters)
            return ActionResult(
                success=True,
                data=data,
                description=self._summarize(request.action_type, data),
            )
        except Exception as e:
            return ActionResult(success=False, error=str(e))

    async def can_execute(self, action_type: ActionType) -> bool:
        return action_type in ActionType

    async def health_check(self) -> bool:
        try:
            return self.db is not None and len(self.db.patients) > 0
        except Exception:
            return False

    # ── Action handlers ──────────────────────────────────────────────────

    async def _query_patients(self, params: dict) -> list[dict]:
        patients = self.db.patients

        # Filter by trial
        if trial_id := params.get("trial_id"):
            patients = [p for p in patients if p["trial_id"] == trial_id]

        # Filter by risk level
        if risk := params.get("risk_level"):
            thresholds = {"high": 0.7, "medium": 0.4, "low": 0.0}
            min_risk = thresholds.get(risk, 0)
            max_risk = 1.0 if risk == "high" else thresholds.get(
                {"low": "medium", "medium": "high"}.get(risk, "high"), 1.0
            )
            patients = [
                p for p in patients
                if min_risk <= p["dropout_risk_score"] < max_risk
            ]

        # Filter by status
        if status := params.get("status"):
            patients = [p for p in patients if p["status"] == status]

        # Filter by overdue visits
        if params.get("overdue_only"):
            today = datetime.now().date()
            patients = [
                p for p in patients
                if p.get("next_visit_date") and 
                datetime.fromisoformat(p["next_visit_date"]).date() < today
            ]

        # Sort by risk score (highest first)
        patients = sorted(patients, key=lambda p: p["dropout_risk_score"], reverse=True)

        # Limit
        limit = params.get("limit", 20)
        return patients[:limit]

    async def _get_risk_scores(self, params: dict) -> list[dict]:
        patients = self.db.patients

        if patient_id := params.get("patient_id"):
            patients = [p for p in patients if p["patient_id"] == patient_id]

        return [
            {
                "patient_id": p["patient_id"],
                "name": p["name"],
                "trial_id": p["trial_id"],
                "dropout_risk_score": p["dropout_risk_score"],
                "risk_level": (
                    "high" if p["dropout_risk_score"] >= 0.7
                    else "medium" if p["dropout_risk_score"] >= 0.4
                    else "low"
                ),
                "risk_factors": p.get("risk_factors", []),
                "recommended_actions": p.get("recommended_actions", []),
            }
            for p in sorted(patients, key=lambda x: x["dropout_risk_score"], reverse=True)
        ]

    async def _schedule_visit(self, params: dict) -> dict:
        patient_id = params["patient_id"]
        visit_date = params["visit_date"]
        visit_type = params.get("visit_type", "follow_up")

        # In v1, we just record the intent. In production, this writes to CTMS.
        return {
            "scheduled": True,
            "patient_id": patient_id,
            "visit_date": visit_date,
            "visit_type": visit_type,
            "note": "Visit scheduled in Cadence. In production, this syncs to your CTMS.",
        }

    async def _log_intervention(self, params: dict) -> dict:
        return {
            "logged": True,
            "patient_id": params["patient_id"],
            "intervention_type": params.get("type", "phone_call"),
            "notes": params.get("notes", ""),
            "timestamp": datetime.now().isoformat(),
        }

    async def _send_reminder(self, params: dict) -> dict:
        return {
            "sent": True,
            "patient_id": params["patient_id"],
            "channel": params.get("channel", "sms"),
            "message_preview": f"Reminder for upcoming visit on {params.get('visit_date', 'TBD')}",
            "note": "In production, this sends via Twilio/email integration.",
        }

    async def _search_knowledge(self, params: dict) -> list[dict]:
        """Search institutional knowledge base."""
        query = params.get("query", "").lower()
        knowledge = self.db.knowledge_base

        results = []
        for entry in knowledge:
            # Simple keyword matching (v2: vector similarity search)
            if any(word in entry["content"].lower() for word in query.split()):
                results.append(entry)

        return results[:5]

    async def _get_trial_info(self, params: dict) -> dict | None:
        trial_id = params.get("trial_id")
        for trial in self.db.trials:
            if trial["trial_id"] == trial_id:
                return trial
        return None

    async def _get_patient_timeline(self, params: dict) -> dict:
        patient_id = params["patient_id"]
        patient = next(
            (p for p in self.db.patients if p["patient_id"] == patient_id), None
        )
        if not patient:
            return {"error": f"Patient {patient_id} not found"}

        return {
            "patient_id": patient_id,
            "name": patient["name"],
            "trial_id": patient["trial_id"],
            "enrollment_date": patient["enrollment_date"],
            "events": patient.get("events", []),
            "next_visit_date": patient.get("next_visit_date"),
            "dropout_risk_score": patient["dropout_risk_score"],
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    def _summarize(self, action_type: ActionType, data: Any) -> str:
        if action_type == ActionType.QUERY_PATIENTS:
            return f"Found {len(data)} patients matching your criteria."
        elif action_type == ActionType.GET_RISK_SCORES:
            high = sum(1 for d in data if d["risk_level"] == "high")
            return f"Retrieved risk scores for {len(data)} patients ({high} high-risk)."
        elif action_type == ActionType.SCHEDULE_VISIT:
            return f"Visit scheduled for patient {data['patient_id']} on {data['visit_date']}."
        elif action_type == ActionType.SEARCH_KNOWLEDGE:
            return f"Found {len(data)} knowledge base entries."
        else:
            return "Action completed successfully."
