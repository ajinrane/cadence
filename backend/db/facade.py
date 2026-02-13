"""
DatabaseFacade — Drop-in replacement for PatientDatabase.

Loads data from Postgres repositories into cached lists at startup,
so all existing managers (TaskManager, StaffManager, HandoffGenerator, etc.)
work unchanged. They access db.patients, db.interventions, etc.

Write operations go through repositories AND update the cached lists.
"""

from datetime import datetime


class DatabaseFacade:
    """Drop-in for PatientDatabase. Loads from Postgres into cached lists."""

    def __init__(self, repos: dict):
        self.repos = repos

        # Cached lists — loaded at startup, refreshed on writes
        self.organizations: list[dict] = []
        self.sites: list[dict] = []
        self.trials: list[dict] = []
        self.site_trial_enrollments: list[dict] = []
        self.patients: list[dict] = []
        self.patient_notes: list[dict] = []
        self.interventions: list[dict] = []
        self.data_queries: list[dict] = []
        self.monitoring_visits: list[dict] = []
        self.protocols: list[dict] = []
        self.tasks: list[dict] = []
        self.knowledge_base: list[dict] = []  # legacy compat

    async def load_all(self):
        """Pre-load all data from Postgres into sync-accessible lists."""
        self.organizations = await self.repos["sites"].list_organizations()
        self.sites = await self.repos["sites"].list_sites()
        self.trials = await self.repos["sites"].list_trials()
        self.site_trial_enrollments = await self.repos["sites"].list_enrollments()

        # Patients with full events/notes/interventions
        self.patients = await self.repos["patients"].list_all()

        # Flatten interventions from patients + standalone
        self.interventions = await self.repos["interventions"].list_all()

        # Flatten notes
        self.patient_notes = []
        for p in self.patients:
            for note in p.get("notes", []):
                self.patient_notes.append({
                    **note,
                    "patient_id": p["patient_id"],
                    "site_id": p["site_id"],
                })

        self.data_queries = await self.repos["queries"].list_all()
        self.monitoring_visits = await self.repos["monitoring"].list_all()
        self.protocols = await self.repos["protocols"].list_all()

        # Tasks loaded separately (may be empty — TaskManager generates them)
        self.tasks = await self.repos["tasks"].list_all()

        # Legacy knowledge_base: load Tier 2 entries for fallback compat
        self.knowledge_base = await self.repos["knowledge"].get_entries(tier=2)

    def summary(self, site_id: str | None = None) -> dict:
        """Same logic as PatientDatabase.summary()."""
        patients = self.patients
        if site_id:
            patients = [p for p in patients if p["site_id"] == site_id]

        active = sum(1 for p in patients if p["status"] == "active")
        at_risk = sum(1 for p in patients if p["status"] == "at_risk")
        high_risk = sum(1 for p in patients if p["dropout_risk_score"] >= 0.7)
        overdue = sum(
            1 for p in patients
            if p.get("next_visit_date") and
            datetime.fromisoformat(p["next_visit_date"]).date() < datetime.now().date()
        )

        # Per-site breakdown
        site_stats = {}
        for site in self.sites:
            sid = site["site_id"]
            sp = [p for p in self.patients if p["site_id"] == sid]
            site_stats[sid] = {
                "site_name": site["name"],
                "total_patients": len(sp),
                "active": sum(1 for p in sp if p["status"] == "active"),
                "high_risk": sum(1 for p in sp if p["dropout_risk_score"] >= 0.7),
                "overdue_visits": sum(
                    1 for p in sp
                    if p.get("next_visit_date") and
                    datetime.fromisoformat(p["next_visit_date"]).date() < datetime.now().date()
                ),
            }

        return {
            "total_patients": len(patients),
            "active": active,
            "at_risk": at_risk,
            "high_risk": high_risk,
            "overdue_visits": overdue,
            "trials": len(self.trials),
            "sites": len(self.sites),
            "site_stats": site_stats if not site_id else None,
        }

    async def refresh_patients(self):
        """Re-load patients from DB (after mutations)."""
        self.patients = await self.repos["patients"].list_all()
        # Also refresh notes
        self.patient_notes = []
        for p in self.patients:
            for note in p.get("notes", []):
                self.patient_notes.append({
                    **note,
                    "patient_id": p["patient_id"],
                    "site_id": p["site_id"],
                })

    async def refresh_interventions(self):
        """Re-load interventions from DB."""
        self.interventions = await self.repos["interventions"].list_all()

    async def refresh_tasks(self):
        """Re-load tasks from DB."""
        self.tasks = await self.repos["tasks"].list_all()

    async def refresh_queries(self):
        """Re-load data queries from DB."""
        self.data_queries = await self.repos["queries"].list_all()

    async def refresh_monitoring(self):
        """Re-load monitoring visits from DB."""
        self.monitoring_visits = await self.repos["monitoring"].list_all()

    async def refresh_protocols(self):
        """Re-load protocols from DB."""
        self.protocols = await self.repos["protocols"].list_all()
