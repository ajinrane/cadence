"""
Database Action Provider (v1)
Executes actions by querying the local database / Supabase.
Extended with tasks, protocols, monitoring, interventions, queries, handoff.
"""

from datetime import datetime, timedelta
from typing import Any
from .base import ActionProvider, ActionRequest, ActionResult, ActionType


class DatabaseActionProvider(ActionProvider):
    """v1: All actions resolve to database queries."""

    def __init__(self, db, task_manager=None, protocol_manager=None,
                 monitoring_manager=None, handoff_generator=None):
        self.db = db
        self.task_manager = task_manager
        self.protocol_manager = protocol_manager
        self.monitoring_manager = monitoring_manager
        self.handoff_generator = handoff_generator

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
            ActionType.LIST_TASKS: self._list_tasks,
            ActionType.GET_TODAY_TASKS: self._get_today_tasks,
            ActionType.COMPLETE_TASK: self._complete_task,
            ActionType.SEARCH_PROTOCOLS: self._search_protocols,
            ActionType.GET_PATIENT_SUMMARY: self._get_patient_summary,
            ActionType.GET_MONITORING_PREP: self._get_monitoring_prep,
            ActionType.GET_INTERVENTION_STATS: self._get_intervention_stats,
            ActionType.GET_OPEN_QUERIES: self._get_open_queries,
            ActionType.GET_SITE_ANALYTICS: self._get_site_analytics,
            ActionType.GENERATE_HANDOFF: self._generate_handoff,
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

    # ── Original action handlers ─────────────────────────────────────────

    async def _query_patients(self, params: dict) -> list[dict]:
        patients = self.db.patients

        if site_id := params.get("site_id"):
            patients = [p for p in patients if p["site_id"] == site_id]
        if trial_id := params.get("trial_id"):
            patients = [p for p in patients if p["trial_id"] == trial_id]
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
        if status := params.get("status"):
            patients = [p for p in patients if p["status"] == status]
        if params.get("overdue_only"):
            today = datetime.now().date()
            patients = [
                p for p in patients
                if p.get("next_visit_date") and
                datetime.fromisoformat(p["next_visit_date"]).date() < today
            ]

        patients = sorted(patients, key=lambda p: p["dropout_risk_score"], reverse=True)
        limit = params.get("limit", 20)
        return patients[:limit]

    async def _get_risk_scores(self, params: dict) -> list[dict]:
        patients = self.db.patients

        if site_id := params.get("site_id"):
            patients = [p for p in patients if p["site_id"] == site_id]
        if patient_id := params.get("patient_id"):
            patients = [p for p in patients if p["patient_id"] == patient_id]

        return [
            {
                "patient_id": p["patient_id"],
                "name": p["name"],
                "site_id": p["site_id"],
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
        return {
            "scheduled": True,
            "patient_id": params["patient_id"],
            "visit_date": params["visit_date"],
            "visit_type": params.get("visit_type", "follow_up"),
            "note": "Visit scheduled in Cadence. In production, this syncs to your CTMS.",
        }

    async def _log_intervention(self, params: dict) -> dict:
        patient_id = params["patient_id"]
        patient = next((p for p in self.db.patients if p["patient_id"] == patient_id), None)
        intervention = {
            "id": f"int_{datetime.now().strftime('%H%M%S')}",
            "patient_id": patient_id,
            "site_id": patient["site_id"] if patient else params.get("site_id", ""),
            "trial_id": patient["trial_id"] if patient else params.get("trial_id", ""),
            "type": params.get("type", "phone_call"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "outcome": params.get("outcome", "pending"),
            "notes": params.get("notes", ""),
            "triggered_by": params.get("triggered_by", "manual"),
        }
        self.db.interventions.append(intervention)
        if patient:
            patient["interventions"].append(intervention)
        return intervention

    async def _send_reminder(self, params: dict) -> dict:
        return {
            "sent": True,
            "patient_id": params["patient_id"],
            "channel": params.get("channel", "sms"),
            "message_preview": f"Reminder for upcoming visit on {params.get('visit_date', 'TBD')}",
            "note": "In production, this sends via Twilio/email integration.",
        }

    async def _search_knowledge(self, params: dict) -> list[dict]:
        """Search institutional knowledge base + protocols."""
        query = params.get("query", "").lower()
        site_id = params.get("site_id")
        knowledge = self.db.knowledge_base

        results = []
        for entry in knowledge:
            # Site filter: show site-specific + cross-site entries
            if site_id and entry.get("site_id") and entry["site_id"] != site_id:
                continue
            if any(word in entry["content"].lower() for word in query.split()):
                results.append(entry)

        # Also search protocols if available
        if self.protocol_manager:
            proto_results = self.protocol_manager.search(query, site_id=site_id)
            for pr in proto_results[:3]:
                results.append({
                    "id": pr["chunk_id"],
                    "site_id": pr["site_id"],
                    "category": "protocol",
                    "content": f"[{pr['protocol_name']} - {pr['header']}] {pr['content'][:200]}...",
                    "source": pr["protocol_name"],
                    "trial_type": pr.get("trial_id", ""),
                })

        return results[:8]

    async def _get_trial_info(self, params: dict) -> dict | None:
        trial_id = params.get("trial_id")
        for trial in self.db.trials:
            if trial["trial_id"] == trial_id:
                # Add site enrollment info
                enrollments = [
                    e for e in self.db.site_trial_enrollments
                    if e["trial_id"] == trial_id
                ]
                trial_copy = dict(trial)
                trial_copy["site_enrollments"] = enrollments
                return trial_copy
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
            "site_id": patient["site_id"],
            "trial_id": patient["trial_id"],
            "enrollment_date": patient["enrollment_date"],
            "events": patient.get("events", []),
            "next_visit_date": patient.get("next_visit_date"),
            "dropout_risk_score": patient["dropout_risk_score"],
        }

    # ── New action handlers ──────────────────────────────────────────────

    async def _list_tasks(self, params: dict) -> list[dict]:
        if not self.task_manager:
            return []
        return self.task_manager.list_tasks(
            site_id=params.get("site_id"),
            start_date=params.get("start_date"),
            end_date=params.get("end_date"),
            status=params.get("status", "pending"),
            category=params.get("category"),
        )

    async def _get_today_tasks(self, params: dict) -> dict:
        if not self.task_manager:
            return {}
        return self.task_manager.today_summary(site_id=params.get("site_id"))

    async def _complete_task(self, params: dict) -> dict | None:
        if not self.task_manager:
            return None
        return self.task_manager.complete_task(params["task_id"])

    async def _search_protocols(self, params: dict) -> list[dict]:
        if not self.protocol_manager:
            return []
        return self.protocol_manager.search(
            query=params.get("query", ""),
            site_id=params.get("site_id"),
            trial_id=params.get("trial_id"),
        )

    async def _get_patient_summary(self, params: dict) -> dict:
        patient_id = params["patient_id"]
        patient = next(
            (p for p in self.db.patients if p["patient_id"] == patient_id), None
        )
        if not patient:
            return {"error": f"Patient {patient_id} not found"}

        # Upcoming tasks for this patient
        tasks = []
        if self.task_manager:
            tasks = self.task_manager.list_tasks(patient_id=patient_id, status="pending")[:5]

        # Recent notes
        notes = [n for n in self.db.patient_notes if n["patient_id"] == patient_id][-5:]

        # Open queries
        queries = [q for q in self.db.data_queries
                    if q["patient_id"] == patient_id and q["status"] in ("open", "in_progress")]

        return {
            "patient": patient,
            "upcoming_tasks": tasks,
            "recent_notes": notes,
            "open_queries": queries,
            "recent_interventions": patient.get("interventions", [])[-5:],
        }

    async def _get_monitoring_prep(self, params: dict) -> dict | None:
        if not self.monitoring_manager:
            return None
        site_id = params.get("site_id")
        # Find the next upcoming monitoring visit for this site
        visits = self.monitoring_manager.list_visits(site_id=site_id)
        upcoming = [v for v in visits if v["status"] == "upcoming"]
        if not upcoming:
            return {"message": "No upcoming monitoring visits scheduled."}
        visit = upcoming[0]
        return self.monitoring_manager.get_prep(visit["id"])

    async def _get_intervention_stats(self, params: dict) -> dict:
        site_id = params.get("site_id")
        interventions = self.db.interventions
        if site_id:
            interventions = [i for i in interventions if i["site_id"] == site_id]

        total = len(interventions)
        by_outcome = {}
        by_type = {}
        for i in interventions:
            by_outcome[i["outcome"]] = by_outcome.get(i["outcome"], 0) + 1
            by_type[i["type"]] = by_type.get(i["type"], 0) + 1

        system_rec = [i for i in interventions if i["triggered_by"] == "system_recommendation"]
        system_positive = len([i for i in system_rec if i["outcome"] == "positive"])

        return {
            "total": total,
            "by_outcome": by_outcome,
            "by_type": by_type,
            "system_recommended": len(system_rec),
            "system_success_rate": round(system_positive / max(len(system_rec), 1), 2),
            "this_week": len([
                i for i in interventions
                if i["date"] >= (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            ]),
        }

    async def _get_open_queries(self, params: dict) -> dict:
        site_id = params.get("site_id")
        queries = self.db.data_queries
        if site_id:
            queries = [q for q in queries if q["site_id"] == site_id]

        open_q = [q for q in queries if q["status"] in ("open", "in_progress")]
        return {
            "total_open": len(open_q),
            "queries": open_q[:15],
            "by_status": {
                "open": len([q for q in queries if q["status"] == "open"]),
                "in_progress": len([q for q in queries if q["status"] == "in_progress"]),
                "resolved": len([q for q in queries if q["status"] == "resolved"]),
            },
        }

    async def _get_site_analytics(self, params: dict) -> dict:
        site_id = params.get("site_id")
        patients = self.db.patients
        if site_id:
            patients = [p for p in patients if p["site_id"] == site_id]

        active = [p for p in patients if p["status"] in ("active", "at_risk")]
        withdrawn = [p for p in patients if p["status"] == "withdrawn"]
        retention_rate = round((len(active) / max(len(patients), 1)) * 100, 1)

        interventions = self.db.interventions
        if site_id:
            interventions = [i for i in interventions if i["site_id"] == site_id]

        queries = self.db.data_queries
        if site_id:
            queries = [q for q in queries if q["site_id"] == site_id]

        resolved = [q for q in queries if q["status"] == "resolved" and q.get("resolved_date") and q.get("opened_date")]
        avg_resolution = 0
        if resolved:
            days_list = []
            for q in resolved:
                opened = datetime.fromisoformat(q["opened_date"])
                res = datetime.fromisoformat(q["resolved_date"])
                days_list.append((res - opened).days)
            avg_resolution = round(sum(days_list) / len(days_list), 1)

        risk_distribution = {"high": 0, "medium": 0, "low": 0}
        for p in active:
            if p["dropout_risk_score"] >= 0.7:
                risk_distribution["high"] += 1
            elif p["dropout_risk_score"] >= 0.4:
                risk_distribution["medium"] += 1
            else:
                risk_distribution["low"] += 1

        return {
            "site_id": site_id,
            "retention_rate": retention_rate,
            "total_patients": len(patients),
            "active": len(active),
            "withdrawn": len(withdrawn),
            "avg_risk_score": round(sum(p["dropout_risk_score"] for p in active) / max(len(active), 1), 3),
            "risk_distribution": risk_distribution,
            "interventions_total": len(interventions),
            "interventions_this_month": len([
                i for i in interventions
                if i["date"] >= (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            ]),
            "queries_open": len([q for q in queries if q["status"] in ("open", "in_progress")]),
            "avg_query_resolution_days": avg_resolution,
        }

    async def _generate_handoff(self, params: dict) -> dict:
        if not self.handoff_generator:
            return {"error": "Handoff generator not initialized"}
        site_id = params.get("site_id")
        if not site_id:
            return {"error": "site_id is required"}
        return self.handoff_generator.generate(site_id)

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
        elif action_type == ActionType.LIST_TASKS:
            return f"Found {len(data)} tasks."
        elif action_type == ActionType.GET_TODAY_TASKS:
            return f"Today: {data.get('today', 0)} tasks, {data.get('overdue', 0)} overdue."
        elif action_type == ActionType.SEARCH_PROTOCOLS:
            return f"Found {len(data)} protocol sections."
        elif action_type == ActionType.GET_INTERVENTION_STATS:
            return f"Total interventions: {data.get('total', 0)}."
        elif action_type == ActionType.GENERATE_HANDOFF:
            return "Handoff report generated."
        else:
            return "Action completed successfully."
