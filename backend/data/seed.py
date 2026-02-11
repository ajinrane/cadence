"""
Seed Data Generator
Creates realistic fake patient data for development and demos.
Mirrors what a CRC would actually see in their daily workflow.
"""

import random
from datetime import datetime, timedelta
from dataclasses import dataclass, field


FIRST_NAMES = [
    "James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David",
    "Jennifer", "William", "Elizabeth", "Carlos", "Priya", "Wei", "Fatima",
    "Ahmed", "Yuki", "Olga", "Samuel", "Grace", "Thomas", "Angela",
    "Kenji", "Aisha", "Diego", "Sarah", "Ivan", "Mei", "Omar", "Lisa", "Raj",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Patel", "Kim", "Chen", "Singh", "Nakamura", "Ali", "Santos",
]

TRIALS = [
    {
        "trial_id": "NCT05891234",
        "name": "RESOLVE-NASH Phase 3",
        "phase": "Phase 3",
        "condition": "Non-Alcoholic Steatohepatitis (NASH)",
        "sponsor": "Madrigal Pharmaceuticals",
        "total_enrolled": 48,
        "site": "Columbia University Medical Center",
        "pi": "Dr. Elizabeth Chen",
        "expected_duration_weeks": 52,
        "visit_schedule": "Every 4 weeks, with liver biopsy at Week 24 and Week 52",
    },
    {
        "trial_id": "NCT06234567",
        "name": "BEACON-AD Phase 2",
        "phase": "Phase 2",
        "condition": "Early-Stage Alzheimer's Disease",
        "sponsor": "Eisai/Biogen",
        "total_enrolled": 32,
        "site": "Columbia University Medical Center",
        "pi": "Dr. Marcus Webb",
        "expected_duration_weeks": 78,
        "visit_schedule": "Every 2 weeks for infusions, MRI every 12 weeks",
    },
    {
        "trial_id": "NCT06789012",
        "name": "CARDIO-GLP1 Phase 3",
        "phase": "Phase 3",
        "condition": "Heart Failure with Obesity",
        "sponsor": "Novo Nordisk",
        "total_enrolled": 55,
        "site": "Columbia University Medical Center",
        "pi": "Dr. Anita Patel",
        "expected_duration_weeks": 40,
        "visit_schedule": "Every 4 weeks, fasting labs at Week 6, 18, 30",
    },
]

RISK_FACTORS_POOL = [
    "Missed last scheduled visit",
    "Transportation barriers (lives >30 miles from site)",
    "Reported side effects at last visit (nausea, fatigue)",
    "Employment conflict with visit schedule",
    "Caregiver responsibilities limiting availability",
    "Language barrier (needs interpreter services)",
    "History of non-adherence to medication",
    "Upcoming fasting lab visit (historically high dropout)",
    "3+ weeks since last site contact",
    "Insurance change pending",
    "Expressed frustration with visit frequency",
    "Seasonal pattern: winter dropout risk elevated",
    "First-time trial participant (no prior experience)",
    "Complex dosing regimen (>3 daily medications)",
    "Adverse event reported but not yet resolved",
]

RECOMMENDED_ACTIONS_MAP = {
    "Missed last scheduled visit": "Call within 24 hours to reschedule. Offer flexible time slots.",
    "Transportation barriers (lives >30 miles from site)": "Arrange ride service or discuss telehealth options for non-lab visits.",
    "Reported side effects at last visit (nausea, fatigue)": "Schedule check-in call. Review symptom management strategies.",
    "Employment conflict with visit schedule": "Offer early morning or evening appointment slots.",
    "Caregiver responsibilities limiting availability": "Coordinate visit timing. Explore home visit option if protocol allows.",
    "Language barrier (needs interpreter services)": "Confirm interpreter booked for next visit. Send materials in preferred language.",
    "History of non-adherence to medication": "Implement adherence check-in calls between visits.",
    "Upcoming fasting lab visit (historically high dropout)": "Pre-call 48 hours before. Explain fasting requirements. Emphasize importance.",
    "3+ weeks since last site contact": "Immediate wellness check call. Re-engage with study updates.",
    "Insurance change pending": "Connect with financial coordinator. Clarify trial coverage.",
    "Expressed frustration with visit frequency": "Acknowledge concerns. Review remaining visit schedule. Highlight progress.",
    "Seasonal pattern: winter dropout risk elevated": "Proactive outreach. Offer weather-flexible scheduling.",
    "First-time trial participant (no prior experience)": "Extra education and check-ins. Pair with experienced participant if possible.",
    "Complex dosing regimen (>3 daily medications)": "Provide pill organizer. Set up medication reminder system.",
    "Adverse event reported but not yet resolved": "Prioritize AE follow-up. Coordinate with PI for resolution plan.",
}

KNOWLEDGE_BASE = [
    {
        "id": "kb_001",
        "category": "retention_strategy",
        "content": "For NASH trials with fasting visits, calling patients 48 hours before the fasting visit reduces no-shows by 40%. Always confirm they understand the fasting window (8 hours minimum).",
        "source": "CRC Maria Gonzalez, RESOLVE-NASH, Nov 2025",
        "trial_type": "NASH",
    },
    {
        "id": "kb_002",
        "category": "retention_strategy",
        "content": "Alzheimer's trial participants often rely on caregivers for transportation. When a caregiver cancels, the participant drops out. Always get backup caregiver contact info at enrollment.",
        "source": "CRC David Park, BEACON-AD, Oct 2025",
        "trial_type": "Alzheimer's",
    },
    {
        "id": "kb_003",
        "category": "protocol_tip",
        "content": "GLP-1 trials see highest dropout between Week 4-8 due to GI side effects. Proactive nausea management education at enrollment cuts Week 4-8 dropout by 25%.",
        "source": "Site data analysis, CARDIO-GLP1, Dec 2025",
        "trial_type": "GLP-1",
    },
    {
        "id": "kb_004",
        "category": "workflow",
        "content": "When a patient misses a visit, the protocol allows a 7-day window for most visits. Don't mark as 'missed' until Day 8. Call on Day 1, text on Day 3, escalate to PI on Day 5.",
        "source": "Site SOP, Columbia CUMC, Standard",
        "trial_type": "General",
    },
    {
        "id": "kb_005",
        "category": "retention_strategy",
        "content": "Winter months (Dec-Feb) see 15% higher dropout across all trials at our site. Start proactive outreach in November. Offer telehealth alternatives when weather is severe.",
        "source": "Site annual review, 2024",
        "trial_type": "General",
    },
    {
        "id": "kb_006",
        "category": "onboarding",
        "content": "New CRCs should shadow for at least 2 weeks before managing patients independently. The biggest mistake is not documenting informal conversations with patients - these contain critical retention signals.",
        "source": "CRC Training Manual, Columbia CUMC",
        "trial_type": "General",
    },
    {
        "id": "kb_007",
        "category": "retention_strategy",
        "content": "For patients expressing frustration with visit frequency, showing them a visual timeline of remaining visits with milestones reduces early termination requests by 30%.",
        "source": "CRC Angela Torres, multiple trials, 2024",
        "trial_type": "General",
    },
]

EVENT_TYPES = [
    "enrollment", "screening_visit", "baseline_visit", "follow_up_visit",
    "lab_work", "phone_check_in", "missed_visit", "adverse_event_reported",
    "medication_dispensed", "protocol_deviation", "visit_rescheduled",
]


def generate_patient(trial: dict, patient_num: int) -> dict:
    """Generate a single realistic patient record."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    patient_id = f"PT-{trial['trial_id'][-4:]}-{patient_num:03d}"

    # Enrollment date: 1-26 weeks ago
    weeks_enrolled = random.randint(1, 26)
    enrollment_date = datetime.now() - timedelta(weeks=weeks_enrolled)

    # Risk score with realistic distribution (most patients are low-medium risk)
    risk_score = random.betavariate(2, 5)  # Skewed toward lower risk
    # Some patients are genuinely high risk
    if random.random() < 0.15:
        risk_score = random.uniform(0.7, 0.95)

    risk_score = round(risk_score, 3)

    # Risk factors (more for higher risk patients)
    num_factors = 1 if risk_score < 0.3 else (2 if risk_score < 0.6 else random.randint(2, 4))
    risk_factors = random.sample(RISK_FACTORS_POOL, min(num_factors, len(RISK_FACTORS_POOL)))
    recommended_actions = [RECOMMENDED_ACTIONS_MAP[rf] for rf in risk_factors]

    # Status
    if risk_score > 0.85 and random.random() < 0.3:
        status = "at_risk"
    elif random.random() < 0.05:
        status = "withdrawn"
    elif random.random() < 0.08:
        status = "screen_failed"
    else:
        status = "active"

    # Next visit date
    if status in ("active", "at_risk"):
        days_until_visit = random.randint(-7, 21)  # Some overdue
        next_visit = datetime.now() + timedelta(days=days_until_visit)
        next_visit_date = next_visit.strftime("%Y-%m-%d")
    else:
        next_visit_date = None

    # Generate timeline events
    events = _generate_events(enrollment_date, weeks_enrolled, risk_score)

    return {
        "patient_id": patient_id,
        "name": f"{first} {last}",
        "age": random.randint(28, 78),
        "sex": random.choice(["Male", "Female"]),
        "trial_id": trial["trial_id"],
        "trial_name": trial["name"],
        "site": trial["site"],
        "status": status,
        "enrollment_date": enrollment_date.strftime("%Y-%m-%d"),
        "weeks_enrolled": weeks_enrolled,
        "dropout_risk_score": risk_score,
        "risk_factors": risk_factors,
        "recommended_actions": recommended_actions,
        "next_visit_date": next_visit_date,
        "visits_completed": max(1, weeks_enrolled // 4 + random.randint(-1, 1)),
        "visits_missed": random.choices([0, 0, 0, 1, 1, 2, 3], weights=[40, 20, 15, 10, 8, 5, 2])[0],
        "last_contact_date": (datetime.now() - timedelta(days=random.randint(0, 21))).strftime("%Y-%m-%d"),
        "phone": f"({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}",
        "events": events,
    }


def _generate_events(enrollment_date: datetime, weeks_enrolled: int, risk_score: float) -> list[dict]:
    """Generate a realistic patient event timeline."""
    events = [
        {
            "type": "enrollment",
            "date": enrollment_date.strftime("%Y-%m-%d"),
            "note": "Patient enrolled and consented.",
        }
    ]

    current_date = enrollment_date + timedelta(days=7)
    now = datetime.now()

    while current_date < now:
        if random.random() < 0.7:  # 70% chance of an event each week
            event_type = random.choice(["follow_up_visit", "phone_check_in", "lab_work"])
            
            # Higher risk patients more likely to have missed visits
            if risk_score > 0.6 and random.random() < 0.25:
                event_type = "missed_visit"
            
            if risk_score > 0.5 and random.random() < 0.1:
                event_type = "adverse_event_reported"

            notes_map = {
                "follow_up_visit": "Routine follow-up visit completed. Vitals within normal range.",
                "phone_check_in": "Phone check-in. Patient reports no concerns.",
                "lab_work": "Lab samples collected per protocol.",
                "missed_visit": "Patient did not attend scheduled visit. Attempting to reschedule.",
                "adverse_event_reported": "Patient reported mild nausea. Documented in safety log.",
            }

            events.append({
                "type": event_type,
                "date": current_date.strftime("%Y-%m-%d"),
                "note": notes_map.get(event_type, "Event recorded."),
            })

        current_date += timedelta(days=random.randint(5, 10))

    return events


class PatientDatabase:
    """In-memory database for development. Production uses Supabase."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.trials = TRIALS
        self.patients = []
        self.knowledge_base = KNOWLEDGE_BASE

        # Generate patients for each trial
        for trial in TRIALS:
            num_patients = trial["total_enrolled"]
            for i in range(1, num_patients + 1):
                self.patients.append(generate_patient(trial, i))

        random.seed()  # Reset seed

    def summary(self) -> dict:
        active = sum(1 for p in self.patients if p["status"] == "active")
        at_risk = sum(1 for p in self.patients if p["status"] == "at_risk")
        high_risk = sum(1 for p in self.patients if p["dropout_risk_score"] >= 0.7)
        overdue = sum(
            1 for p in self.patients
            if p.get("next_visit_date") and
            datetime.fromisoformat(p["next_visit_date"]).date() < datetime.now().date()
        )
        return {
            "total_patients": len(self.patients),
            "active": active,
            "at_risk": at_risk,
            "high_risk": high_risk,
            "overdue_visits": overdue,
            "trials": len(self.trials),
        }
