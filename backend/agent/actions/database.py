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
                 monitoring_manager=None, handoff_generator=None,
                 knowledge_manager=None, staff_manager=None,
                 patient_resolver=None):
        self.db = db
        self.task_manager = task_manager
        self.protocol_manager = protocol_manager
        self.monitoring_manager = monitoring_manager
        self.handoff_generator = handoff_generator
        self.knowledge_manager = knowledge_manager
        self.staff_manager = staff_manager
        self.patient_resolver = patient_resolver

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
            ActionType.SEARCH_KNOWLEDGE_GRAPH: self._search_knowledge_graph,
            ActionType.CREATE_TASK: self._create_task,
            ActionType.ADD_SITE_KNOWLEDGE: self._add_site_knowledge,
            ActionType.RESOLVE_PATIENT: self._resolve_patient,
            ActionType.GET_STAFF_WORKLOAD: self._get_staff_workload,
            ActionType.REASSIGN_PATIENT: self._reassign_patient,
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
            "logged": True,
            "patient_id": params["patient_id"],
            "visit_date": params["visit_date"],
            "visit_type": params.get("visit_type", "follow_up"),
            "note": "Visit logged in Cadence and added to your calendar. In production, this will sync directly to your CTMS. For now, remember to also enter this in your scheduling system.",
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
        channel = params.get("channel", "sms")
        return {
            "queued": True,
            "patient_id": params["patient_id"],
            "channel": channel,
            "message_preview": f"Reminder for upcoming visit on {params.get('visit_date', 'TBD')}",
            "note": f"Reminder logged in Cadence. Actual {channel} delivery coming soon — use this as your reminder to contact the patient manually.",
        }

    async def _search_knowledge(self, params: dict) -> list[dict]:
        """Search institutional knowledge base + protocols."""
        query = params.get("query", "")
        site_id = params.get("site_id")

        results = []

        # Use knowledge manager if available (three-tier search)
        if self.knowledge_manager:
            kg_results = self.knowledge_manager.search(
                query=query, site_id=site_id, limit=6
            )
            # Strip internal scoring field
            for r in kg_results:
                r.pop("_score", None)
            results.extend(kg_results)
        else:
            # Fallback to legacy knowledge_base on db
            knowledge = self.db.knowledge_base
            query_lower = query.lower()
            for entry in knowledge:
                if site_id and entry.get("site_id") and entry["site_id"] != site_id:
                    continue
                if any(word in entry["content"].lower() for word in query_lower.split()):
                    results.append(entry)

        # Also search protocols if available
        if self.protocol_manager:
            proto_results = self.protocol_manager.search(query, site_id=site_id)
            for pr in proto_results[:3]:
                results.append({
                    "id": pr["chunk_id"],
                    "tier": "protocol",
                    "site_id": pr["site_id"],
                    "category": "protocol",
                    "content": f"[{pr['protocol_name']} - {pr['header']}] {pr['content'][:200]}...",
                    "source": pr["protocol_name"],
                    "trial_type": pr.get("trial_id", ""),
                })

        return results[:10]

    async def _search_knowledge_graph(self, params: dict) -> dict:
        """Search the three-tier knowledge graph with tier/category filters."""
        if not self.knowledge_manager:
            return {"error": "Knowledge manager not initialized", "results": []}

        query = params.get("query", "")
        site_id = params.get("site_id")
        tier = params.get("tier")
        category = params.get("category")
        limit = params.get("limit", 10)

        if tier is not None:
            tier = int(tier)

        results = self.knowledge_manager.search(
            query=query, site_id=site_id, tier=tier,
            category=category, limit=limit,
        )

        # Strip internal scoring field
        for r in results:
            r.pop("_score", None)

        tier_labels = {1: "Base Knowledge", 2: "Site Knowledge", 3: "Cross-Site Intelligence"}
        for r in results:
            r["tier_label"] = tier_labels.get(r.get("tier"), "Unknown")

        return {
            "query": query,
            "total": len(results),
            "results": results,
        }

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

    async def _create_task(self, params: dict) -> dict:
        """Create a task via the agent (from natural language like 'remind me to call X tomorrow')."""
        if not self.task_manager:
            return {"error": "Task manager not initialized"}

        # Resolve site_id: use explicit param, or infer from patient
        site_id = params.get("site_id", "")
        patient_id = params.get("patient_id")
        if patient_id and not site_id:
            patient = next((p for p in self.db.patients if p["patient_id"] == patient_id), None)
            if patient:
                site_id = patient["site_id"]

        if not site_id:
            # Default to first site
            site_id = self.db.sites[0]["site_id"] if self.db.sites else ""

        due_date = params.get("due_date", datetime.now().strftime("%Y-%m-%d"))

        task_data = {
            "title": params.get("title", "Untitled task"),
            "description": params.get("notes", ""),
            "patient_id": patient_id,
            "trial_id": params.get("trial_id"),
            "site_id": site_id,
            "due_date": due_date,
            "priority": params.get("priority", "normal"),
            "category": params.get("category", "documentation"),
        }

        # Add optional time fields as metadata in description
        scheduled_time = params.get("scheduled_time")
        duration = params.get("estimated_duration_minutes")
        if scheduled_time:
            task_data["description"] = f"Scheduled: {scheduled_time}" + (f" ({duration} min)" if duration else "") + (f"\n{task_data['description']}" if task_data["description"] else "")

        task = self.task_manager.add_task(task_data)
        task["created_by"] = "agent"
        return task

    async def _add_site_knowledge(self, params: dict) -> dict:
        """Add a site knowledge entry from chat conversation."""
        if not self.knowledge_manager:
            return {"error": "Knowledge manager not initialized"}

        site_id = params.get("site_id", "")
        if not site_id:
            site_id = self.db.sites[0]["site_id"] if self.db.sites else ""

        entry = self.knowledge_manager.add_site_entry(
            site_id=site_id,
            category=params.get("category", "lesson_learned"),
            content=params.get("content", ""),
            source=params.get("source", "CRC via Cadence chat"),
            author=params.get("author"),
            trial_id=params.get("trial_id"),
            tags=params.get("tags", []),
        )
        return entry

    async def _resolve_patient(self, params: dict) -> dict:
        """Resolve a natural language patient reference to a patient record."""
        if not self.patient_resolver:
            return {"resolved": False, "message": "Patient resolver not initialized"}

        query = params.get("query", "")
        site_id = params.get("site_id")
        result = self.patient_resolver.resolve(query, site_id=site_id)

        if result["match"] in ("exact", "single"):
            p = result["patients"][0]
            return {
                "resolved": True,
                "patient": {
                    "patient_id": p["patient_id"],
                    "name": p["name"],
                    "trial_name": p["trial_name"],
                    "site_id": p["site_id"],
                    "risk_score": p["dropout_risk_score"],
                    "status": p["status"],
                },
                "patient_id": p["patient_id"],
                "confidence": result["confidence"],
            }
        elif result["match"] == "multiple":
            return {
                "resolved": False,
                "candidates": [
                    {
                        "patient_id": p["patient_id"],
                        "name": p["name"],
                        "trial_name": p["trial_name"],
                        "risk_score": p["dropout_risk_score"],
                    }
                    for p in result["patients"]
                ],
                "message": f"I found {len(result['patients'])} patients that could match. Which one did you mean?",
                "confidence": result["confidence"],
            }
        else:
            return {
                "resolved": False,
                "message": f"No patient found matching '{query}'. Could you give me more details — a full name, patient ID, or trial?",
                "confidence": 0,
            }

    async def _get_staff_workload(self, params: dict) -> dict:
        """Get team workload overview."""
        if not self.staff_manager:
            return {"error": "Staff manager not initialized"}
        site_id = params.get("site_id")
        workload = self.staff_manager.get_workload(site_id=site_id)
        return {
            "staff": workload,
            "total_staff": len(workload),
            "capacity_recommendations": self.staff_manager.get_capacity_recommendations()[:3],
        }

    async def _reassign_patient(self, params: dict) -> dict:
        """Reassign a patient's primary CRC."""
        if not self.staff_manager:
            return {"error": "Staff manager not initialized"}
        patient_id = params.get("patient_id")
        staff_id = params.get("staff_id")
        if not patient_id or not staff_id:
            return {"error": "Both patient_id and staff_id are required"}
        result = self.staff_manager.assign_patient(patient_id, staff_id)
        if not result:
            return {"error": f"Could not reassign — check patient_id and staff_id"}
        staff = self.staff_manager.get_staff(staff_id)
        return {
            "reassigned": True,
            "patient_id": patient_id,
            "patient_name": result["name"],
            "new_crc": staff["name"] if staff else staff_id,
            "new_crc_id": staff_id,
        }

    # ── Helpers ──────────────────────────────────────────────────────────

    def _summarize(self, action_type: ActionType, data: Any) -> str:
        if action_type == ActionType.QUERY_PATIENTS:
            return f"Found {len(data)} patients matching your criteria."
        elif action_type == ActionType.GET_RISK_SCORES:
            high = sum(1 for d in data if d["risk_level"] == "high")
            return f"Retrieved risk scores for {len(data)} patients ({high} high-risk)."
        elif action_type == ActionType.SCHEDULE_VISIT:
            return f"Visit logged for patient {data['patient_id']} on {data['visit_date']}. Remember to also enter this in your CTMS."
        elif action_type == ActionType.SEARCH_KNOWLEDGE:
            return f"Found {len(data)} knowledge base entries."
        elif action_type == ActionType.SEARCH_KNOWLEDGE_GRAPH:
            return f"Found {data.get('total', 0)} knowledge entries across tiers."
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
        elif action_type == ActionType.CREATE_TASK:
            return f"Task created: {data.get('title', 'task')} (due {data.get('due_date', 'TBD')})."
        elif action_type == ActionType.ADD_SITE_KNOWLEDGE:
            return f"Knowledge entry added: {data.get('category', 'entry')} (Tier 2)."
        elif action_type == ActionType.RESOLVE_PATIENT:
            if data.get("resolved"):
                return f"Resolved patient: {data.get('patient', {}).get('name', 'unknown')} ({data.get('patient_id', '')})."
            return f"Patient resolution: {data.get('message', 'no match')}."
        elif action_type == ActionType.GET_STAFF_WORKLOAD:
            return f"Staff workload: {data.get('total_staff', 0)} team members."
        elif action_type == ActionType.REASSIGN_PATIENT:
            if data.get("reassigned"):
                return f"Reassigned {data.get('patient_name', '')} to {data.get('new_crc', '')}."
            return f"Reassignment failed: {data.get('error', 'unknown error')}."
        else:
            return "Action completed successfully."
