"""
Staff Manager — Manages CRC staff, patient assignments, and workload.

Seeds staff across all three sites, auto-assigns patients to CRCs based
on trial specialties, and tracks workload for capacity planning.
"""

import uuid
from datetime import datetime


def _uid() -> str:
    return uuid.uuid4().hex[:8]


STAFF_SEED = [
    # Columbia (3 staff)
    {
        "id": "staff_col_001", "name": "Maria Gonzalez", "email": "m.gonzalez@columbia.edu",
        "role": "lead_crc", "site_id": "site_columbia", "active": True,
        "specialties": ["NCT05891234", "NCT06789012"], "max_patient_load": 25,
    },
    {
        "id": "staff_col_002", "name": "James Park", "email": "j.park@columbia.edu",
        "role": "crc", "site_id": "site_columbia", "active": True,
        "specialties": ["NCT06234567"], "max_patient_load": 20,
    },
    {
        "id": "staff_col_003", "name": "Lisa Chen", "email": "l.chen@columbia.edu",
        "role": "research_assistant", "site_id": "site_columbia", "active": True,
        "specialties": [], "max_patient_load": 10,
    },
    # VA Long Beach (3 staff)
    {
        "id": "staff_va_001", "name": "David Kim", "email": "d.kim@va.gov",
        "role": "lead_crc", "site_id": "site_va_lb", "active": True,
        "specialties": ["NCT06234567", "NCT06789012"], "max_patient_load": 22,
    },
    {
        "id": "staff_va_002", "name": "Angela Torres", "email": "a.torres@va.gov",
        "role": "crc", "site_id": "site_va_lb", "active": True,
        "specialties": ["NCT06234567"], "max_patient_load": 20,
    },
    {
        "id": "staff_va_003", "name": "Robert Williams", "email": "r.williams@va.gov",
        "role": "crc", "site_id": "site_va_lb", "active": True,
        "specialties": ["NCT06789012"], "max_patient_load": 18,
    },
    # Mount Sinai (2 staff)
    {
        "id": "staff_sin_001", "name": "Sarah Ahmed", "email": "s.ahmed@mountsinai.org",
        "role": "lead_crc", "site_id": "site_sinai", "active": True,
        "specialties": ["NCT05891234", "NCT06789012"], "max_patient_load": 22,
    },
    {
        "id": "staff_sin_002", "name": "Kenji Nakamura", "email": "k.nakamura@mountsinai.org",
        "role": "crc", "site_id": "site_sinai", "active": True,
        "specialties": ["NCT06789012"], "max_patient_load": 20,
    },
]

ROLE_LABELS = {
    "lead_crc": "Lead CRC",
    "crc": "CRC",
    "research_assistant": "Research Assistant",
    "site_admin": "Site Admin",
    "pi": "Principal Investigator",
}


class StaffManager:
    """Manages CRC staff, patient-to-CRC assignments, and workload tracking."""

    def __init__(self, db, task_manager=None):
        self.db = db
        self.task_manager = task_manager
        self.staff: list[dict] = [dict(s) for s in STAFF_SEED]
        self._assign_patients()
        if task_manager:
            self._assign_tasks()

    def _assign_patients(self):
        """Distribute patients to CRCs based on trial specialty and capacity."""
        # Build lookup: site_id + trial_id → list of CRC staff_ids
        specialty_map = {}
        for s in self.staff:
            if s["role"] not in ("crc", "lead_crc") or not s["active"]:
                continue
            for trial_id in s["specialties"]:
                key = (s["site_id"], trial_id)
                specialty_map.setdefault(key, []).append(s["id"])

        # Track current load per staff
        load = {s["id"]: 0 for s in self.staff}

        for patient in self.db.patients:
            if patient["status"] not in ("active", "at_risk"):
                patient["primary_crc_id"] = None
                continue

            key = (patient["site_id"], patient["trial_id"])
            candidates = specialty_map.get(key, [])

            if not candidates:
                # Fallback: any CRC at this site
                candidates = [
                    s["id"] for s in self.staff
                    if s["site_id"] == patient["site_id"]
                    and s["role"] in ("crc", "lead_crc")
                    and s["active"]
                ]

            if not candidates:
                patient["primary_crc_id"] = None
                continue

            # Pick the CRC with lightest current load
            best = min(candidates, key=lambda sid: load.get(sid, 0))
            patient["primary_crc_id"] = best
            load[best] = load.get(best, 0) + 1

    def _assign_tasks(self):
        """Assign tasks to staff based on patient's primary CRC."""
        # Build patient → CRC lookup
        patient_crc = {}
        for p in self.db.patients:
            if p.get("primary_crc_id"):
                patient_crc[p["patient_id"]] = p["primary_crc_id"]

        # Track load per staff for tasks without patient_id
        task_load = {s["id"]: 0 for s in self.staff}

        for task in self.task_manager.tasks:
            pid = task.get("patient_id")
            if pid and pid in patient_crc:
                task["assigned_to"] = patient_crc[pid]
            else:
                # Assign to lightest-loaded CRC at the site
                site_crcs = [
                    s["id"] for s in self.staff
                    if s["site_id"] == task["site_id"]
                    and s["role"] in ("crc", "lead_crc")
                    and s["active"]
                ]
                if site_crcs:
                    best = min(site_crcs, key=lambda sid: task_load.get(sid, 0))
                    task["assigned_to"] = best
                    task_load[best] = task_load.get(best, 0) + 1
                else:
                    task["assigned_to"] = None

    # ── Queries ──────────────────────────────────────────────────────

    def list_staff(self, site_id: str = None, role: str = None) -> list[dict]:
        results = self.staff
        if site_id:
            results = [s for s in results if s["site_id"] == site_id]
        if role:
            results = [s for s in results if s["role"] == role]
        return [self._enrich(s) for s in results]

    def get_staff(self, staff_id: str) -> dict | None:
        s = next((s for s in self.staff if s["id"] == staff_id), None)
        if not s:
            return None
        return self._enrich(s)

    def get_workload(self, site_id: str = None) -> list[dict]:
        staff = self.staff
        if site_id:
            staff = [s for s in staff if s["site_id"] == site_id]
        return [self._workload_detail(s) for s in staff if s["active"]]

    def get_staff_tasks(self, staff_id: str, start_date: str = None, end_date: str = None) -> list[dict]:
        if not self.task_manager:
            return []
        tasks = [t for t in self.task_manager.tasks if t.get("assigned_to") == staff_id]
        if start_date:
            tasks = [t for t in tasks if t["due_date"] >= start_date]
        if end_date:
            tasks = [t for t in tasks if t["due_date"] <= end_date]
        return sorted(tasks, key=lambda t: t["due_date"])

    def get_staff_patients(self, staff_id: str) -> list[dict]:
        return [
            p for p in self.db.patients
            if p.get("primary_crc_id") == staff_id
            and p["status"] in ("active", "at_risk")
        ]

    def assign_task(self, task_id: str, staff_id: str) -> dict | None:
        if not self.task_manager:
            return None
        # Verify staff exists
        if not any(s["id"] == staff_id for s in self.staff):
            return None
        task = next((t for t in self.task_manager.tasks if t["id"] == task_id), None)
        if not task:
            return None
        task["assigned_to"] = staff_id
        return task

    def assign_patient(self, patient_id: str, staff_id: str) -> dict | None:
        if not any(s["id"] == staff_id for s in self.staff):
            return None
        patient = next((p for p in self.db.patients if p["patient_id"] == patient_id), None)
        if not patient:
            return None
        patient["primary_crc_id"] = staff_id
        return patient

    def add_staff(self, data: dict) -> dict:
        staff = {
            "id": f"staff_{_uid()}",
            "name": data["name"],
            "email": data["email"],
            "role": data["role"],
            "site_id": data["site_id"],
            "active": True,
            "specialties": data.get("specialties", []),
            "max_patient_load": data.get("max_patient_load", 20),
        }
        self.staff.append(staff)
        return staff

    def update_staff(self, staff_id: str, updates: dict) -> dict | None:
        s = next((s for s in self.staff if s["id"] == staff_id), None)
        if not s:
            return None
        for key in ("name", "email", "role", "active", "specialties", "max_patient_load"):
            if key in updates and updates[key] is not None:
                s[key] = updates[key]
        return s

    def get_capacity_recommendations(self) -> list[dict]:
        """Find staff with room for new patients."""
        recs = []
        for s in self.staff:
            if not s["active"] or s["role"] not in ("crc", "lead_crc"):
                continue
            current = len([p for p in self.db.patients if p.get("primary_crc_id") == s["id"]])
            available = s["max_patient_load"] - current
            if available > 0:
                recs.append({
                    "staff_id": s["id"],
                    "name": s["name"],
                    "site_id": s["site_id"],
                    "role": s["role"],
                    "current_patients": current,
                    "max_load": s["max_patient_load"],
                    "available_capacity": available,
                    "utilization_pct": round(current / s["max_patient_load"] * 100, 1),
                })
        return sorted(recs, key=lambda r: r["available_capacity"], reverse=True)

    # ── Internal helpers ─────────────────────────────────────────────

    def _enrich(self, staff: dict) -> dict:
        """Add computed fields to a staff record."""
        s = dict(staff)
        s["role_label"] = ROLE_LABELS.get(s["role"], s["role"])
        patient_count = len([p for p in self.db.patients if p.get("primary_crc_id") == s["id"]])
        task_count = 0
        if self.task_manager:
            task_count = len([
                t for t in self.task_manager.tasks
                if t.get("assigned_to") == s["id"] and t["status"] == "pending"
            ])
        s["patient_count"] = patient_count
        s["pending_task_count"] = task_count
        s["utilization_pct"] = round(patient_count / max(s["max_patient_load"], 1) * 100, 1)
        return s

    def _workload_detail(self, staff: dict) -> dict:
        """Detailed workload breakdown for a staff member."""
        s = self._enrich(staff)
        # Task breakdown by priority
        if self.task_manager:
            tasks = [t for t in self.task_manager.tasks if t.get("assigned_to") == s["id"] and t["status"] == "pending"]
            s["tasks_by_priority"] = {
                "urgent": len([t for t in tasks if t["priority"] == "urgent"]),
                "high": len([t for t in tasks if t["priority"] == "high"]),
                "normal": len([t for t in tasks if t["priority"] == "normal"]),
                "low": len([t for t in tasks if t["priority"] == "low"]),
            }
            today = datetime.now().strftime("%Y-%m-%d")
            s["tasks_overdue"] = len([t for t in tasks if t["due_date"] < today])
            s["tasks_today"] = len([t for t in tasks if t["due_date"] == today])
        return s
