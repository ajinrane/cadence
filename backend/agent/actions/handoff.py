"""
CRC Handoff / Onboarding Generator
The crown jewel: when a CRC quits and a new one starts, Cadence briefs them.
Pulls from ALL data: patients, tasks, interventions, protocols, knowledge base,
monitoring visits, data queries.
"""

from datetime import datetime, timedelta


class HandoffGenerator:
    """Compiles a comprehensive handoff report for a site."""

    def __init__(self, db, task_manager, protocol_manager, monitoring_manager, staff_manager=None):
        self.db = db
        self.task_manager = task_manager
        self.protocol_manager = protocol_manager
        self.monitoring_manager = monitoring_manager
        self.staff_manager = staff_manager

    def generate(self, site_id: str) -> dict:
        """Generate a full handoff briefing for a site."""
        site = next((s for s in self.db.sites if s["site_id"] == site_id), None)
        if not site:
            return {"error": f"Site {site_id} not found"}

        patients = [p for p in self.db.patients if p["site_id"] == site_id]
        active = [p for p in patients if p["status"] in ("active", "at_risk")]

        return {
            "site_id": site_id,
            "generated_at": datetime.now().isoformat(),
            "site_overview": self._site_overview(site, patients),
            "critical_patients": self._critical_patients(active),
            "open_tasks": self._open_tasks(site_id),
            "protocol_reference": self._protocol_reference(site_id),
            "what_works_here": self._what_works_here(site_id, patients),
            "upcoming_dates": self._upcoming_dates(site_id, active),
            "monitoring_status": self._monitoring_status(site_id),
            "open_queries": self._open_queries(site_id),
            "intervention_history": self._intervention_summary(site_id),
            "team": self._team_overview(site_id),
        }

    def _site_overview(self, site: dict, patients: list[dict]) -> dict:
        active = [p for p in patients if p["status"] == "active"]
        at_risk = [p for p in patients if p["status"] == "at_risk"]
        withdrawn = [p for p in patients if p["status"] == "withdrawn"]
        high_risk = [p for p in patients if p["dropout_risk_score"] >= 0.7]

        # Trials at this site
        trial_ids = set(p["trial_id"] for p in patients)
        site_trials = []
        for tid in trial_ids:
            trial = next((t for t in self.db.trials if t["trial_id"] == tid), None)
            if trial:
                trial_patients = [p for p in patients if p["trial_id"] == tid]
                site_trials.append({
                    "trial_id": tid,
                    "name": trial["name"],
                    "condition": trial["condition"],
                    "enrolled": len(trial_patients),
                    "active": len([p for p in trial_patients if p["status"] == "active"]),
                    "high_risk": len([p for p in trial_patients if p["dropout_risk_score"] >= 0.7]),
                })

        return {
            "site_name": site["name"],
            "location": site["location"],
            "pi": site["pi_name"],
            "total_patients": len(patients),
            "active": len(active),
            "at_risk": len(at_risk),
            "withdrawn": len(withdrawn),
            "high_risk": len(high_risk),
            "avg_risk_score": round(sum(p["dropout_risk_score"] for p in active) / max(len(active), 1), 3),
            "trials": site_trials,
        }

    def _critical_patients(self, active_patients: list[dict]) -> list[dict]:
        """Top patients that need immediate attention."""
        sorted_patients = sorted(active_patients, key=lambda p: p["dropout_risk_score"], reverse=True)
        critical = []
        for p in sorted_patients[:10]:
            recent_interventions = [
                i for i in self.db.interventions
                if i["patient_id"] == p["patient_id"]
            ][-3:]  # last 3

            notes = [n for n in self.db.patient_notes if n["patient_id"] == p["patient_id"]][-3:]

            today = datetime.now().date()
            last_contact = datetime.fromisoformat(p["last_contact_date"]).date()
            days_since = (today - last_contact).days

            critical.append({
                "patient_id": p["patient_id"],
                "name": p["name"],
                "trial_name": p["trial_name"],
                "risk_score": p["dropout_risk_score"],
                "status": p["status"],
                "risk_factors": p["risk_factors"],
                "recommended_actions": p["recommended_actions"],
                "days_since_contact": days_since,
                "next_visit": p.get("next_visit_date"),
                "recent_interventions": recent_interventions,
                "recent_notes": notes,
                "visits_missed": p.get("visits_missed", 0),
            })
        return critical

    def _open_tasks(self, site_id: str) -> dict:
        tasks = self.task_manager.list_tasks(site_id=site_id, status="pending")
        today = datetime.now().strftime("%Y-%m-%d")
        overdue = [t for t in tasks if t["due_date"] < today]
        return {
            "total_pending": len(tasks),
            "overdue": len(overdue),
            "urgent": [t for t in tasks if t["priority"] == "urgent"][:5],
            "high": [t for t in tasks if t["priority"] == "high"][:5],
            "by_category": {
                cat: len([t for t in tasks if t["category"] == cat])
                for cat in set(t["category"] for t in tasks)
            },
        }

    def _protocol_reference(self, site_id: str) -> list[dict]:
        """Key protocol info for each trial at this site."""
        protos = self.protocol_manager.list_protocols(site_id=site_id)
        summaries = []
        for proto in protos:
            summaries.append({
                "name": proto["name"],
                "trial_id": proto["trial_id"],
                "version": proto["version"],
                "is_site_specific": proto["site_id"] is not None,
                "sections": [c["header"] for c in proto["chunks"]],
            })
        return summaries

    def _what_works_here(self, site_id: str, patients: list[dict]) -> dict:
        """Retention strategies with evidence from intervention outcomes."""
        # Site-specific knowledge
        site_knowledge = [
            kb for kb in self.db.knowledge_base
            if kb["site_id"] == site_id or kb["site_id"] is None
        ]

        # Intervention effectiveness
        site_interventions = [i for i in self.db.interventions if i["site_id"] == site_id]
        total = len(site_interventions)
        positive = len([i for i in site_interventions if i["outcome"] == "positive"])
        system_rec = len([i for i in site_interventions if i["triggered_by"] == "system_recommendation"])
        system_positive = len([
            i for i in site_interventions
            if i["triggered_by"] == "system_recommendation" and i["outcome"] == "positive"
        ])

        # Best intervention types
        type_outcomes = {}
        for i in site_interventions:
            if i["type"] not in type_outcomes:
                type_outcomes[i["type"]] = {"total": 0, "positive": 0}
            type_outcomes[i["type"]]["total"] += 1
            if i["outcome"] == "positive":
                type_outcomes[i["type"]]["positive"] += 1

        best_types = sorted(
            [
                {"type": k, "total": v["total"], "positive": v["positive"],
                 "success_rate": round(v["positive"] / max(v["total"], 1), 2)}
                for k, v in type_outcomes.items()
            ],
            key=lambda x: x["success_rate"],
            reverse=True,
        )

        return {
            "knowledge_base": [
                {"category": kb["category"], "content": kb["content"], "source": kb["source"]}
                for kb in site_knowledge
            ],
            "intervention_stats": {
                "total": total,
                "positive_outcome_rate": round(positive / max(total, 1), 2),
                "system_recommended": system_rec,
                "system_success_rate": round(system_positive / max(system_rec, 1), 2),
            },
            "best_intervention_types": best_types[:5],
        }

    def _upcoming_dates(self, site_id: str, active_patients: list[dict]) -> dict:
        today = datetime.now().date()
        week_ahead = (today + timedelta(days=7)).strftime("%Y-%m-%d")

        visits_this_week = [
            {"patient_id": p["patient_id"], "name": p["name"],
             "trial_name": p["trial_name"], "date": p["next_visit_date"],
             "risk_score": p["dropout_risk_score"]}
            for p in active_patients
            if p.get("next_visit_date") and p["next_visit_date"] <= week_ahead
        ]
        visits_this_week.sort(key=lambda v: v["date"])

        # Monitoring visits
        monitoring = [
            v for v in self.db.monitoring_visits
            if v["site_id"] == site_id and v["status"] == "upcoming"
        ]

        return {
            "visits_this_week": visits_this_week,
            "overdue_visits": [
                {"patient_id": p["patient_id"], "name": p["name"],
                 "date": p["next_visit_date"], "risk_score": p["dropout_risk_score"]}
                for p in active_patients
                if p.get("next_visit_date") and p["next_visit_date"] < today.strftime("%Y-%m-%d")
            ],
            "monitoring_visits": monitoring,
        }

    def _monitoring_status(self, site_id: str) -> dict:
        visits = [v for v in self.db.monitoring_visits if v["site_id"] == site_id]
        upcoming = [v for v in visits if v["status"] == "upcoming"]
        prep = None
        if upcoming:
            prep = self.monitoring_manager.get_prep(upcoming[0]["id"])
        return {
            "total_visits": len(visits),
            "upcoming": len(upcoming),
            "next_visit": upcoming[0] if upcoming else None,
            "readiness": prep["summary"] if prep else None,
        }

    def _open_queries(self, site_id: str) -> dict:
        queries = [q for q in self.db.data_queries if q["site_id"] == site_id]
        open_q = [q for q in queries if q["status"] in ("open", "in_progress")]
        return {
            "total_open": len(open_q),
            "queries": open_q[:10],
            "by_status": {
                "open": len([q for q in queries if q["status"] == "open"]),
                "in_progress": len([q for q in queries if q["status"] == "in_progress"]),
                "resolved": len([q for q in queries if q["status"] == "resolved"]),
            },
        }

    def _intervention_summary(self, site_id: str) -> dict:
        interventions = [i for i in self.db.interventions if i["site_id"] == site_id]
        recent = sorted(interventions, key=lambda i: i["date"], reverse=True)[:10]
        return {
            "total": len(interventions),
            "recent": recent,
            "by_outcome": {
                outcome: len([i for i in interventions if i["outcome"] == outcome])
                for outcome in ["positive", "neutral", "negative", "pending"]
            },
        }

    def _team_overview(self, site_id: str) -> dict:
        """Staff assignments and workload for the site."""
        if not self.staff_manager:
            return {"available": False}
        staff = self.staff_manager.list_staff(site_id=site_id)
        workload = self.staff_manager.get_workload(site_id=site_id)
        return {
            "available": True,
            "staff": [
                {
                    "name": s["name"],
                    "role": s.get("role_label", s["role"]),
                    "email": s["email"],
                    "patient_count": s.get("patient_count", 0),
                    "pending_task_count": s.get("pending_task_count", 0),
                    "utilization_pct": s.get("utilization_pct", 0),
                }
                for s in staff
            ],
            "workload_summary": {
                "total_staff": len(workload),
                "avg_utilization": round(
                    sum(w.get("utilization_pct", 0) for w in workload) / max(len(workload), 1), 1
                ),
            },
        }
