"""
Task Manager
Auto-generates and manages CRC tasks from patient data.
Tasks come from: upcoming visits, overdue follow-ups, risk-based interventions,
data query resolution, and monitoring prep.
"""

import uuid
from datetime import datetime, timedelta


def _uid() -> str:
    return uuid.uuid4().hex[:8]


TASK_CATEGORIES = ["visit", "call", "lab", "documentation", "intervention", "query", "monitoring"]
PRIORITIES = ["urgent", "high", "normal", "low"]
STATUSES = ["pending", "completed", "snoozed"]


class TaskManager:
    """Generates and manages CRC tasks from patient data."""

    def __init__(self, db):
        self.db = db
        self.tasks: list[dict] = []
        self._generate_tasks()

    def _generate_tasks(self):
        """Auto-generate tasks from patient data."""
        today = datetime.now().date()

        for patient in self.db.patients:
            if patient["status"] not in ("active", "at_risk"):
                continue

            # Upcoming visit tasks
            if patient.get("next_visit_date"):
                visit_date = datetime.fromisoformat(patient["next_visit_date"]).date()
                days_until = (visit_date - today).days

                if days_until < 0:
                    # Overdue visit
                    self.tasks.append({
                        "id": f"task_{_uid()}",
                        "title": f"Reschedule overdue visit for {patient['name']}",
                        "description": f"Visit was due {patient['next_visit_date']}. Contact patient to reschedule immediately.",
                        "patient_id": patient["patient_id"],
                        "trial_id": patient["trial_id"],
                        "site_id": patient["site_id"],
                        "due_date": today.strftime("%Y-%m-%d"),
                        "priority": "urgent",
                        "status": "pending",
                        "category": "visit",
                        "created_by": "system",
                    })
                elif days_until <= 2:
                    # Visit in next 2 days — confirm
                    self.tasks.append({
                        "id": f"task_{_uid()}",
                        "title": f"Confirm visit for {patient['name']}",
                        "description": f"Visit scheduled {patient['next_visit_date']}. Call to confirm attendance.",
                        "patient_id": patient["patient_id"],
                        "trial_id": patient["trial_id"],
                        "site_id": patient["site_id"],
                        "due_date": (visit_date - timedelta(days=1)).strftime("%Y-%m-%d"),
                        "priority": "high",
                        "status": "pending",
                        "category": "call",
                        "created_by": "system",
                    })
                elif days_until <= 7:
                    # Visit this week — prep reminder
                    self.tasks.append({
                        "id": f"task_{_uid()}",
                        "title": f"Prep for {patient['name']}'s visit on {patient['next_visit_date']}",
                        "description": f"Review protocol requirements. Ensure labs are ordered and interpreter booked if needed.",
                        "patient_id": patient["patient_id"],
                        "trial_id": patient["trial_id"],
                        "site_id": patient["site_id"],
                        "due_date": (visit_date - timedelta(days=2)).strftime("%Y-%m-%d"),
                        "priority": "normal",
                        "status": "pending",
                        "category": "visit",
                        "created_by": "system",
                    })

            # Risk-based intervention tasks
            if patient["dropout_risk_score"] >= 0.7:
                last_contact = datetime.fromisoformat(patient["last_contact_date"]).date()
                days_since = (today - last_contact).days
                if days_since >= 7:
                    self.tasks.append({
                        "id": f"task_{_uid()}",
                        "title": f"Risk intervention: call {patient['name']}",
                        "description": f"High-risk patient ({patient['dropout_risk_score']:.0%}). Last contact {days_since} days ago. Top factor: {patient['risk_factors'][0] if patient['risk_factors'] else 'N/A'}",
                        "patient_id": patient["patient_id"],
                        "trial_id": patient["trial_id"],
                        "site_id": patient["site_id"],
                        "due_date": today.strftime("%Y-%m-%d"),
                        "priority": "high",
                        "status": "pending",
                        "category": "intervention",
                        "created_by": "system",
                    })

            # No-contact follow-up (14+ days)
            if patient.get("last_contact_date"):
                last_contact = datetime.fromisoformat(patient["last_contact_date"]).date()
                days_since = (today - last_contact).days
                if days_since >= 14 and patient["dropout_risk_score"] < 0.7:
                    self.tasks.append({
                        "id": f"task_{_uid()}",
                        "title": f"Check in with {patient['name']} (no contact {days_since}d)",
                        "description": f"No site contact in {days_since} days. Quick check-in call recommended.",
                        "patient_id": patient["patient_id"],
                        "trial_id": patient["trial_id"],
                        "site_id": patient["site_id"],
                        "due_date": today.strftime("%Y-%m-%d"),
                        "priority": "normal",
                        "status": "pending",
                        "category": "call",
                        "created_by": "system",
                    })

        # Data query resolution tasks
        for query in self.db.data_queries:
            if query["status"] in ("open", "in_progress"):
                patient = next(
                    (p for p in self.db.patients if p["patient_id"] == query["patient_id"]), None
                )
                name = patient["name"] if patient else query["patient_id"]
                self.tasks.append({
                    "id": f"task_{_uid()}",
                    "title": f"Resolve data query: {name}",
                    "description": query["description"],
                    "patient_id": query["patient_id"],
                    "trial_id": query["trial_id"],
                    "site_id": query["site_id"],
                    "due_date": (datetime.fromisoformat(query["opened_date"]) + timedelta(days=7)).strftime("%Y-%m-%d"),
                    "priority": "high" if query["status"] == "open" else "normal",
                    "status": "pending",
                    "category": "query",
                    "created_by": "system",
                })

        # Monitoring prep tasks
        for visit in self.db.monitoring_visits:
            if visit["status"] == "upcoming":
                self.tasks.append({
                    "id": f"task_{_uid()}",
                    "title": f"Prep for monitoring visit ({visit['monitor_name']})",
                    "description": f"Monitoring visit scheduled {visit['scheduled_date']}. Ensure all source documents, consent forms, and drug accountability logs are current.",
                    "patient_id": None,
                    "trial_id": None,
                    "site_id": visit["site_id"],
                    "due_date": (datetime.fromisoformat(visit["scheduled_date"]) - timedelta(days=3)).strftime("%Y-%m-%d"),
                    "priority": "high",
                    "status": "pending",
                    "category": "monitoring",
                    "created_by": "system",
                })

        # Store in db
        self.db.tasks = self.tasks

    def list_tasks(
        self,
        site_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        status: str | None = None,
        category: str | None = None,
        patient_id: str | None = None,
    ) -> list[dict]:
        tasks = self.tasks
        if site_id:
            tasks = [t for t in tasks if t["site_id"] == site_id]
        if start_date:
            tasks = [t for t in tasks if t["due_date"] >= start_date]
        if end_date:
            tasks = [t for t in tasks if t["due_date"] <= end_date]
        if status:
            tasks = [t for t in tasks if t["status"] == status]
        if category:
            tasks = [t for t in tasks if t["category"] == category]
        if patient_id:
            tasks = [t for t in tasks if t["patient_id"] == patient_id]
        return sorted(tasks, key=lambda t: (
            PRIORITIES.index(t["priority"]) if t["priority"] in PRIORITIES else 99,
            t["due_date"],
        ))

    def today_summary(self, site_id: str | None = None) -> dict:
        today = datetime.now().strftime("%Y-%m-%d")
        tasks = self.list_tasks(site_id=site_id, status="pending")
        overdue = [t for t in tasks if t["due_date"] < today]
        today_tasks = [t for t in tasks if t["due_date"] == today]
        upcoming = [t for t in tasks if t["due_date"] > today]

        return {
            "date": today,
            "site_id": site_id,
            "overdue": len(overdue),
            "today": len(today_tasks),
            "upcoming_7d": len([t for t in upcoming if t["due_date"] <= (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")]),
            "total_pending": len(tasks),
            "by_priority": {
                "urgent": len([t for t in tasks if t["priority"] == "urgent"]),
                "high": len([t for t in tasks if t["priority"] == "high"]),
                "normal": len([t for t in tasks if t["priority"] == "normal"]),
                "low": len([t for t in tasks if t["priority"] == "low"]),
            },
            "by_category": {
                cat: len([t for t in tasks if t["category"] == cat])
                for cat in TASK_CATEGORIES
            },
            "tasks_overdue": overdue[:10],
            "tasks_today": today_tasks[:10],
        }

    def complete_task(self, task_id: str) -> dict | None:
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "completed"
                task["completed_date"] = datetime.now().strftime("%Y-%m-%d")
                return task
        return None

    def snooze_task(self, task_id: str, days: int = 1) -> dict | None:
        for task in self.tasks:
            if task["id"] == task_id:
                task["status"] = "snoozed"
                new_date = datetime.fromisoformat(task["due_date"]) + timedelta(days=days)
                task["due_date"] = new_date.strftime("%Y-%m-%d")
                task["snoozed_until"] = new_date.strftime("%Y-%m-%d")
                return task
        return None

    def add_task(self, task_data: dict) -> dict:
        task = {
            "id": f"task_{_uid()}",
            "title": task_data["title"],
            "description": task_data.get("description", ""),
            "patient_id": task_data.get("patient_id"),
            "trial_id": task_data.get("trial_id"),
            "site_id": task_data["site_id"],
            "due_date": task_data["due_date"],
            "priority": task_data.get("priority", "normal"),
            "status": "pending",
            "category": task_data.get("category", "documentation"),
            "created_by": "manual",
        }
        self.tasks.append(task)
        return task

    def update_task(self, task_id: str, updates: dict) -> dict | None:
        for task in self.tasks:
            if task["id"] == task_id:
                for key in ["title", "description", "priority", "due_date", "status", "category"]:
                    if key in updates:
                        task[key] = updates[key]
                if updates.get("status") == "completed":
                    task["completed_date"] = datetime.now().strftime("%Y-%m-%d")
                return task
        return None
