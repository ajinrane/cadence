"""
Monitoring Visit Prep Manager
Auto-generates checklists for CRA monitoring visits.
Flags patients with issues a monitor would catch.
"""

import uuid
import random
from datetime import datetime


def _uid() -> str:
    return uuid.uuid4().hex[:8]


CHECKLIST_ITEMS = [
    {
        "category": "consent",
        "title": "Informed consent forms current and signed",
        "description": "Verify all enrolled patients have the latest consent version on file with all pages initialed and dated.",
    },
    {
        "category": "source_docs",
        "title": "Source documents up to date",
        "description": "All visit data transcribed to source documents. No pending entries older than 7 days.",
    },
    {
        "category": "ae_logs",
        "title": "Adverse event logs complete",
        "description": "All AEs documented with onset date, severity, relatedness, and resolution. SAEs reported within required timeframe.",
    },
    {
        "category": "drug_accountability",
        "title": "Drug accountability logs current",
        "description": "Study drug dispensing and return logs match. Pill counts reconciled at each visit.",
    },
    {
        "category": "protocol_deviations",
        "title": "Protocol deviations documented",
        "description": "All deviations have completed deviation reports with corrective actions documented.",
    },
    {
        "category": "visit_windows",
        "title": "Visit windows compliant",
        "description": "All completed visits fall within protocol-defined visit windows. Out-of-window visits documented as deviations.",
    },
    {
        "category": "labs",
        "title": "Lab results filed and reviewed",
        "description": "All lab results received, filed in patient binder, and reviewed/signed by PI. Clinically significant values actioned.",
    },
    {
        "category": "regulatory",
        "title": "Regulatory binder current",
        "description": "All essential documents in regulatory binder per ICH E6. CVs current, medical licenses valid, delegation log updated.",
    },
]


class MonitoringPrepManager:
    """Manages monitoring visit prep and checklists."""

    def __init__(self, db):
        self.db = db
        # Generate checklists for all monitoring visits
        for visit in self.db.monitoring_visits:
            if not visit["checklist"]:
                visit["checklist"] = self._generate_checklist(visit)

    def _generate_checklist(self, visit: dict) -> list[dict]:
        """Auto-generate a prep checklist based on site patient data."""
        site_id = visit["site_id"]
        patients = [p for p in self.db.patients if p["site_id"] == site_id and p["status"] in ("active", "at_risk")]

        checklist = []
        for item_template in CHECKLIST_ITEMS:
            # Determine status based on patient data
            affected = []
            status = "ready"
            notes = ""

            if item_template["category"] == "consent":
                # Random: ~10% of patients might have consent issues
                for p in patients:
                    if random.random() < 0.08:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) may need re-consent with latest version."

            elif item_template["category"] == "source_docs":
                # Patients with recent visits might have pending docs
                for p in patients:
                    if p.get("visits_missed", 0) > 0 and random.random() < 0.3:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) have incomplete source documents."

            elif item_template["category"] == "ae_logs":
                # High-risk patients more likely to have AE issues
                for p in patients:
                    if p["dropout_risk_score"] > 0.6 and random.random() < 0.2:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) have AE documentation gaps."
                elif visit["status"] == "upcoming":
                    status = "ready"
                    notes = "All AE logs reviewed and current."

            elif item_template["category"] == "drug_accountability":
                for p in patients:
                    if random.random() < 0.05:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) have drug dispensing discrepancies."

            elif item_template["category"] == "protocol_deviations":
                # Check for missed visits (potential deviations)
                for p in patients:
                    if p.get("visits_missed", 0) >= 2:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) have potential undocumented deviations (missed visits)."

            elif item_template["category"] == "visit_windows":
                for p in patients:
                    if p.get("visits_missed", 0) > 0 and random.random() < 0.15:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) may have out-of-window visits."

            elif item_template["category"] == "labs":
                for p in patients:
                    if random.random() < 0.06:
                        affected.append(p["patient_id"])
                if affected:
                    status = "needs_attention"
                    notes = f"{len(affected)} patient(s) have unsigned lab results."
                else:
                    status = "ready"
                    notes = "All lab results filed and PI-signed."

            elif item_template["category"] == "regulatory":
                if random.random() < 0.3:
                    status = "needs_attention"
                    notes = "Delegation log needs updating — new CRC started this month."
                else:
                    status = "ready"
                    notes = "All regulatory documents current."

            if not notes and status == "ready":
                notes = "Verified and current."

            checklist.append({
                "id": f"chk_{_uid()}",
                "category": item_template["category"],
                "title": item_template["title"],
                "description": item_template["description"],
                "status": status,
                "patient_ids": affected,
                "notes": notes,
            })

        return checklist

    def list_visits(self, site_id: str | None = None) -> list[dict]:
        visits = self.db.monitoring_visits
        if site_id:
            visits = [v for v in visits if v["site_id"] == site_id]
        return sorted(visits, key=lambda v: v["scheduled_date"])

    def get_visit(self, visit_id: str) -> dict | None:
        return next((v for v in self.db.monitoring_visits if v["id"] == visit_id), None)

    def get_prep(self, visit_id: str) -> dict | None:
        visit = self.get_visit(visit_id)
        if not visit:
            return None

        checklist = visit.get("checklist", [])
        total = len(checklist)
        ready = sum(1 for c in checklist if c["status"] == "ready")
        needs_attention = sum(1 for c in checklist if c["status"] == "needs_attention")

        return {
            "visit": visit,
            "checklist": checklist,
            "summary": {
                "total_items": total,
                "ready": ready,
                "needs_attention": needs_attention,
                "not_started": total - ready - needs_attention,
                "readiness_pct": round((ready / total) * 100) if total > 0 else 0,
            },
        }

    def update_checklist_item(self, visit_id: str, item_id: str, updates: dict) -> dict | None:
        visit = self.get_visit(visit_id)
        if not visit:
            return None
        for item in visit.get("checklist", []):
            if item["id"] == item_id:
                for key in ["status", "notes"]:
                    if key in updates:
                        item[key] = updates[key]
                return item
        return None

    def schedule_visit(self, site_id: str, monitor_name: str, date: str) -> dict:
        visit = {
            "id": f"mon_{_uid()}",
            "site_id": site_id,
            "monitor_name": monitor_name,
            "scheduled_date": date,
            "status": "upcoming",
            "checklist": [],
        }
        self.db.monitoring_visits.append(visit)
        # Generate checklist
        visit["checklist"] = self._generate_checklist(visit)
        return visit
