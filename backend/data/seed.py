"""
Seed Data Generator
Creates realistic fake patient data for development and demos.
Multi-site: organizations, sites, cross-site trials.
Every record is tagged with site_id and organization_id.
"""

import random
import uuid
from datetime import datetime, timedelta


FIRST_NAMES = [
    "James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David",
    "Jennifer", "William", "Elizabeth", "Carlos", "Priya", "Wei", "Fatima",
    "Ahmed", "Yuki", "Olga", "Samuel", "Grace", "Thomas", "Angela",
    "Kenji", "Aisha", "Diego", "Sarah", "Ivan", "Mei", "Omar", "Lisa", "Raj",
    "Hannah", "Nathan", "Sofia", "Marcus", "Elena", "Derek", "Nadia",
    "Victor", "Chloe", "Oscar",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Patel", "Kim", "Chen", "Singh", "Nakamura", "Ali", "Santos",
    "Rivera", "Clark", "Lewis", "Young", "Hall", "Wright", "Adams",
]

# ── Organizations ────────────────────────────────────────────────────────

ORGANIZATIONS = [
    {
        "organization_id": "org_columbia",
        "name": "Columbia University Irving Medical Center",
        "type": "academic_medical_center",
    },
    {
        "organization_id": "org_va_lb",
        "name": "VA Long Beach Healthcare System",
        "type": "va_hospital",
    },
    {
        "organization_id": "org_sinai",
        "name": "Mount Sinai Health System",
        "type": "academic_medical_center",
    },
]

# ── Sites ────────────────────────────────────────────────────────────────

SITES = [
    {
        "site_id": "site_columbia",
        "organization_id": "org_columbia",
        "name": "Columbia CUMC Clinical Trials Unit",
        "location": "New York, NY",
        "pi_name": "Dr. Elizabeth Chen",
        "crc_count": 4,
    },
    {
        "site_id": "site_va_lb",
        "organization_id": "org_va_lb",
        "name": "VA Long Beach Research Service",
        "location": "Long Beach, CA",
        "pi_name": "Dr. Marcus Webb",
        "crc_count": 3,
    },
    {
        "site_id": "site_sinai",
        "organization_id": "org_sinai",
        "name": "Mount Sinai Clinical Research Center",
        "location": "New York, NY",
        "pi_name": "Dr. Anita Patel",
        "crc_count": 3,
    },
]

# ── Trials (multi-center: same trial_id at multiple sites) ──────────────

TRIALS = [
    {
        "trial_id": "NCT05891234",
        "name": "RESOLVE-NASH Phase 3",
        "phase": "Phase 3",
        "condition": "Non-Alcoholic Steatohepatitis (NASH)",
        "sponsor": "Madrigal Pharmaceuticals",
        "expected_duration_weeks": 52,
        "visit_schedule": "Every 4 weeks, with liver biopsy at Week 24 and Week 52",
    },
    {
        "trial_id": "NCT06234567",
        "name": "BEACON-AD Phase 2",
        "phase": "Phase 2",
        "condition": "Early-Stage Alzheimer's Disease",
        "sponsor": "Eisai/Biogen",
        "expected_duration_weeks": 78,
        "visit_schedule": "Every 2 weeks for infusions, MRI every 12 weeks",
    },
    {
        "trial_id": "NCT06789012",
        "name": "CARDIO-GLP1 Phase 3",
        "phase": "Phase 3",
        "condition": "Heart Failure with Obesity",
        "sponsor": "Novo Nordisk",
        "expected_duration_weeks": 40,
        "visit_schedule": "Every 4 weeks, fasting labs at Week 6, 18, 30",
    },
]

# Which trials run at which sites, with per-site enrollment
SITE_TRIAL_ENROLLMENTS = [
    # Columbia — 3 trials
    {"site_id": "site_columbia", "trial_id": "NCT05891234", "enrolled": 25, "pi": "Dr. Elizabeth Chen"},
    {"site_id": "site_columbia", "trial_id": "NCT06234567", "enrolled": 18, "pi": "Dr. Elizabeth Chen"},
    {"site_id": "site_columbia", "trial_id": "NCT06789012", "enrolled": 20, "pi": "Dr. Elizabeth Chen"},
    # VA Long Beach — 2 trials
    {"site_id": "site_va_lb", "trial_id": "NCT06234567", "enrolled": 20, "pi": "Dr. Marcus Webb"},
    {"site_id": "site_va_lb", "trial_id": "NCT06789012", "enrolled": 22, "pi": "Dr. Marcus Webb"},
    # Mount Sinai — 2 trials
    {"site_id": "site_sinai", "trial_id": "NCT05891234", "enrolled": 22, "pi": "Dr. Anita Patel"},
    {"site_id": "site_sinai", "trial_id": "NCT06789012", "enrolled": 18, "pi": "Dr. Anita Patel"},
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

# ── Knowledge Base (site-specific + cross-site) ─────────────────────────

KNOWLEDGE_BASE = [
    # Columbia-specific
    {
        "id": "kb_001",
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "For NASH trials with fasting visits, calling patients 48 hours before the fasting visit reduces no-shows by 40%. Always confirm they understand the fasting window (8 hours minimum).",
        "source": "CRC Maria Gonzalez, RESOLVE-NASH, Columbia, Nov 2025",
        "trial_type": "NASH",
    },
    {
        "id": "kb_002",
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "Alzheimer's trial participants often rely on caregivers for transportation. When a caregiver cancels, the participant drops out. Always get backup caregiver contact info at enrollment.",
        "source": "CRC David Park, BEACON-AD, Columbia, Oct 2025",
        "trial_type": "Alzheimer's",
    },
    {
        "id": "kb_003",
        "site_id": "site_columbia",
        "category": "workflow",
        "content": "When a patient misses a visit, the protocol allows a 7-day window for most visits. Don't mark as 'missed' until Day 8. Call on Day 1, text on Day 3, escalate to PI on Day 5.",
        "source": "Site SOP, Columbia CUMC, Standard",
        "trial_type": "General",
    },
    # VA Long Beach-specific
    {
        "id": "kb_004",
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "VA patients often have multiple comorbidities and VA appointments competing for time. Coordinate with primary care scheduler to avoid double-booking days. Consolidating visits increases retention by 20%.",
        "source": "CRC Janet Flores, VA Long Beach, Sep 2025",
        "trial_type": "General",
    },
    {
        "id": "kb_005",
        "site_id": "site_va_lb",
        "category": "protocol_tip",
        "content": "VA pharmacy turnaround for study drug dispensing is 48-72 hours longer than academic sites. Order refills a full week before the patient visit, not 3 days.",
        "source": "CRC Tom Nguyen, VA Long Beach, Aug 2025",
        "trial_type": "General",
    },
    {
        "id": "kb_006",
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "For Alzheimer's patients at the VA, the caregiver is often a spouse who is also a veteran. Offer joint scheduling — they can both attend VA on the same day. Reduces missed visits by 35%.",
        "source": "CRC Janet Flores, BEACON-AD, VA, Nov 2025",
        "trial_type": "Alzheimer's",
    },
    # Mount Sinai-specific
    {
        "id": "kb_007",
        "site_id": "site_sinai",
        "category": "retention_strategy",
        "content": "Mount Sinai NASH patients respond well to text message reminders 24 hours before visits. Email reminders alone have a 15% open rate here — always use SMS as primary channel.",
        "source": "CRC Rachel Kim, RESOLVE-NASH, Sinai, Dec 2025",
        "trial_type": "NASH",
    },
    {
        "id": "kb_008",
        "site_id": "site_sinai",
        "category": "workflow",
        "content": "Sinai's IRB requires 48-hour turnaround for protocol deviation reports. Log deviations same-day and submit within 24 hours to avoid audit findings.",
        "source": "Site SOP, Mount Sinai, Standard",
        "trial_type": "General",
    },
    # Cross-site general knowledge (site_id = None)
    {
        "id": "kb_009",
        "site_id": None,
        "category": "protocol_tip",
        "content": "GLP-1 trials see highest dropout between Week 4-8 due to GI side effects. Proactive nausea management education at enrollment cuts Week 4-8 dropout by 25%.",
        "source": "Cross-site data analysis, CARDIO-GLP1, Dec 2025",
        "trial_type": "GLP-1",
    },
    {
        "id": "kb_010",
        "site_id": None,
        "category": "retention_strategy",
        "content": "Winter months (Dec-Feb) see 15% higher dropout across all trials at all sites. Start proactive outreach in November. Offer telehealth alternatives when weather is severe.",
        "source": "Cross-site annual review, 2024",
        "trial_type": "General",
    },
    {
        "id": "kb_011",
        "site_id": None,
        "category": "onboarding",
        "content": "New CRCs should shadow for at least 2 weeks before managing patients independently. The biggest mistake is not documenting informal conversations with patients — these contain critical retention signals.",
        "source": "CRC Training Manual, Cross-site Standard",
        "trial_type": "General",
    },
    {
        "id": "kb_012",
        "site_id": None,
        "category": "retention_strategy",
        "content": "For patients expressing frustration with visit frequency, showing them a visual timeline of remaining visits with milestones reduces early termination requests by 30%.",
        "source": "CRC Angela Torres, cross-site, 2024",
        "trial_type": "General",
    },
]

INTERVENTION_TYPES = [
    "phone_call", "email", "sms", "home_visit",
    "transport_arranged", "schedule_accommodation",
    "pi_consultation", "caregiver_outreach",
]

INTERVENTION_OUTCOMES = ["positive", "neutral", "negative", "pending"]

DATA_QUERY_FIELDS = [
    "blood_pressure", "consent_form", "visit_date", "lab_results",
    "medication_log", "adverse_event", "weight", "ecg",
]

DATA_QUERY_DESCRIPTIONS = [
    "Visit {visit_num} blood pressure reading missing from source document",
    "Consent form version outdated — needs re-consent with v3.2",
    "AE onset date conflicts with visit date — clarify timeline",
    "Lab results for Visit {visit_num} not uploaded within 48-hour window",
    "Drug accountability log shows discrepancy — 2 tablets unaccounted",
    "Weight measurement at Visit {visit_num} appears to be transcription error (recorded as 12 kg)",
    "ECG tracing for Visit {visit_num} not signed by PI",
    "Randomization stratification factor recorded incorrectly",
]


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def generate_patient(trial: dict, site: dict, patient_num: int) -> dict:
    """Generate a single realistic patient record with site_id."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    site_code = site["site_id"].split("_")[-1][:3].upper()
    patient_id = f"PT-{site_code}-{trial['trial_id'][-4:]}-{patient_num:03d}"

    weeks_enrolled = random.randint(1, 26)
    enrollment_date = datetime.now() - timedelta(weeks=weeks_enrolled)

    risk_score = random.betavariate(2, 5)
    if random.random() < 0.15:
        risk_score = random.uniform(0.7, 0.95)
    risk_score = round(risk_score, 3)

    num_factors = 1 if risk_score < 0.3 else (2 if risk_score < 0.6 else random.randint(2, 4))
    risk_factors = random.sample(RISK_FACTORS_POOL, min(num_factors, len(RISK_FACTORS_POOL)))
    recommended_actions = [RECOMMENDED_ACTIONS_MAP[rf] for rf in risk_factors]

    if risk_score > 0.85 and random.random() < 0.3:
        status = "at_risk"
    elif random.random() < 0.05:
        status = "withdrawn"
    elif random.random() < 0.08:
        status = "screen_failed"
    else:
        status = "active"

    if status in ("active", "at_risk"):
        days_until_visit = random.randint(-7, 21)
        next_visit = datetime.now() + timedelta(days=days_until_visit)
        next_visit_date = next_visit.strftime("%Y-%m-%d")
    else:
        next_visit_date = None

    events = _generate_events(enrollment_date, weeks_enrolled, risk_score)

    return {
        "patient_id": patient_id,
        "site_id": site["site_id"],
        "organization_id": site["organization_id"],
        "name": f"{first} {last}",
        "age": random.randint(28, 78),
        "sex": random.choice(["Male", "Female"]),
        "trial_id": trial["trial_id"],
        "trial_name": trial["name"],
        "site_name": site["name"],
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
        "notes": [],
        "interventions": [],
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
        if random.random() < 0.7:
            event_type = random.choice(["follow_up_visit", "phone_check_in", "lab_work"])

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


def _generate_interventions(patient: dict) -> list[dict]:
    """Generate realistic fake intervention history for a patient."""
    interventions = []
    risk = patient["dropout_risk_score"]
    # Higher risk patients have more interventions
    count = 0 if risk < 0.3 else (random.randint(1, 2) if risk < 0.6 else random.randint(2, 5))

    for _ in range(count):
        days_ago = random.randint(1, 60)
        int_type = random.choice(INTERVENTION_TYPES[:4])  # mostly phone/email/sms
        if risk > 0.7 and random.random() < 0.3:
            int_type = random.choice(INTERVENTION_TYPES[4:])  # escalated actions
        triggered_by = "system_recommendation" if random.random() < 0.6 else "manual"
        outcome = random.choices(
            INTERVENTION_OUTCOMES,
            weights=[40, 30, 10, 20],
        )[0]

        notes_templates = {
            "phone_call": "Called patient to check on visit adherence. {}",
            "email": "Sent follow-up email with visit details. {}",
            "sms": "Text reminder sent for upcoming visit. {}",
            "home_visit": "Conducted home visit to assess barriers. {}",
            "transport_arranged": "Arranged ride service for next visit. {}",
            "schedule_accommodation": "Rescheduled to evening slot per patient request. {}",
            "pi_consultation": "Discussed patient concerns with PI. {}",
            "caregiver_outreach": "Contacted caregiver to coordinate visit logistics. {}",
        }
        outcome_notes = {
            "positive": "Patient responsive and engaged.",
            "neutral": "No significant change in engagement.",
            "negative": "Patient expressed desire to withdraw.",
            "pending": "Awaiting patient response.",
        }

        interventions.append({
            "id": f"int_{_uid()}",
            "patient_id": patient["patient_id"],
            "site_id": patient["site_id"],
            "trial_id": patient["trial_id"],
            "type": int_type,
            "date": (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
            "outcome": outcome,
            "notes": notes_templates.get(int_type, "Intervention performed. {}").format(
                outcome_notes.get(outcome, "")
            ),
            "triggered_by": triggered_by,
        })

    return sorted(interventions, key=lambda x: x["date"])


def _generate_data_queries(patients: list[dict]) -> list[dict]:
    """Generate realistic data queries across patients."""
    queries = []
    # ~10-15% of active patients have open queries
    candidates = [p for p in patients if p["status"] in ("active", "at_risk")]
    query_patients = random.sample(candidates, min(len(candidates), max(5, len(candidates) // 7)))

    for patient in query_patients:
        field = random.choice(DATA_QUERY_FIELDS)
        visit_num = random.randint(2, max(2, patient["visits_completed"]))
        desc_template = random.choice(DATA_QUERY_DESCRIPTIONS)
        desc = desc_template.replace("{visit_num}", str(visit_num))

        days_open = random.randint(1, 30)
        status = random.choices(["open", "in_progress", "resolved"], weights=[40, 35, 25])[0]
        resolved_date = None
        if status == "resolved":
            resolved_date = (datetime.now() - timedelta(days=random.randint(0, days_open - 1))).strftime("%Y-%m-%d")

        queries.append({
            "id": f"qry_{_uid()}",
            "patient_id": patient["patient_id"],
            "site_id": patient["site_id"],
            "trial_id": patient["trial_id"],
            "field": field,
            "description": desc,
            "status": status,
            "opened_date": (datetime.now() - timedelta(days=days_open)).strftime("%Y-%m-%d"),
            "resolved_date": resolved_date,
            "assigned_to": random.choice(["CRC", "PI", "Data Manager"]),
        })

    return queries


def _generate_monitoring_visits(sites: list[dict]) -> list[dict]:
    """Generate upcoming and past monitoring visits per site."""
    visits = []
    for site in sites:
        # One past visit, one upcoming
        past_date = datetime.now() - timedelta(days=random.randint(20, 60))
        visits.append({
            "id": f"mon_{_uid()}",
            "site_id": site["site_id"],
            "monitor_name": random.choice(["Sarah Mitchell, CRA", "James Rodriguez, Sr. CRA", "Lisa Park, CRA"]),
            "scheduled_date": past_date.strftime("%Y-%m-%d"),
            "status": "completed",
            "checklist": [],
        })

        future_date = datetime.now() + timedelta(days=random.randint(5, 30))
        visits.append({
            "id": f"mon_{_uid()}",
            "site_id": site["site_id"],
            "monitor_name": random.choice(["Sarah Mitchell, CRA", "James Rodriguez, Sr. CRA", "Lisa Park, CRA"]),
            "scheduled_date": future_date.strftime("%Y-%m-%d"),
            "status": "upcoming",
            "checklist": [],
        })

    return visits


PROTOCOL_SNIPPETS = [
    {
        "trial_id": "NCT05891234",
        "site_id": None,
        "name": "RESOLVE-NASH Phase 3 Protocol v4.2",
        "version": "4.2",
        "content": """RESOLVE-NASH Phase 3 Protocol Synopsis

1. STUDY OBJECTIVES
Primary: Evaluate the efficacy of resmetirom 100mg in reducing hepatic fat fraction at Week 52.
Secondary: Assess improvement in NAS score by at least 2 points without worsening fibrosis.

2. STUDY POPULATION
Inclusion: Adults 18-75 with biopsy-confirmed NASH, NAS >= 4, fibrosis stage F1-F3.
Exclusion: Decompensated cirrhosis, ALT > 5x ULN, eGFR < 30, active substance abuse.

3. VISIT SCHEDULE
Screening (Day -42 to -1): Informed consent, medical history, liver biopsy if not done within 6 months.
Baseline (Day 1): Randomization, first dose, complete lab panel.
Follow-up: Every 4 weeks through Week 52.
Liver biopsy: Week 24 and Week 52.
End of study: Week 52 visit with final biopsy and safety labs.

4. FASTING REQUIREMENTS
All lab visits require 8-hour minimum fast. Water permitted.
Fasting labs: Weeks 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52.

5. ADVERSE EVENT REPORTING
All AEs documented within 24 hours of awareness.
SAEs reported to sponsor within 24 hours. PI notification immediate.
Liver enzyme elevations (ALT > 3x ULN): Unscheduled visit within 72 hours.

6. STUDY DRUG
Resmetirom 100mg or placebo, oral, once daily with breakfast.
Drug accountability: pill count at each visit.
Missed doses: take as soon as remembered unless within 12 hours of next dose.""",
    },
    {
        "trial_id": "NCT06234567",
        "site_id": None,
        "name": "BEACON-AD Phase 2 Protocol v2.1",
        "version": "2.1",
        "content": """BEACON-AD Phase 2 Protocol Synopsis

1. STUDY OBJECTIVES
Primary: Evaluate safety and tolerability of BAN2401-G000-301 in early Alzheimer's.
Secondary: Change from baseline in CDR-SB at 78 weeks. Amyloid PET reduction.

2. STUDY POPULATION
Inclusion: Adults 50-85, MCI due to AD or mild AD dementia, amyloid-positive on PET.
Must have study partner available for all visits.
Exclusion: ARIA history, anticoagulant use, MRI contraindications, other neurodegenerative disease.

3. VISIT SCHEDULE
Screening (Day -60 to -1): Consent, amyloid PET, MRI, cognitive testing (3-4 hours).
Infusion visits: Every 2 weeks through Week 78. Duration: ~1 hour infusion + 1 hour observation.
MRI safety monitoring: Weeks 4, 12, 24, 52, 78 (ARIA monitoring).
Cognitive assessments: Weeks 12, 26, 52, 78.

4. ARIA MONITORING
MRI before each dose escalation and per schedule above.
ARIA-E (edema): Hold dosing, repeat MRI in 4 weeks. Resume only if resolved.
ARIA-H (hemorrhage): < 5 microbleeds continue dosing. >= 5 microbleeds hold and consult medical monitor.

5. CAREGIVER REQUIREMENTS
Study partner must attend ALL visits for cognitive assessments.
If primary study partner unavailable, backup study partner must be designated at enrollment.
Study partner absence = visit cannot be completed (protocol deviation if assessments missed).""",
    },
    {
        "trial_id": "NCT06789012",
        "site_id": None,
        "name": "CARDIO-GLP1 Phase 3 Protocol v3.0",
        "version": "3.0",
        "content": """CARDIO-GLP1 Phase 3 Protocol Synopsis

1. STUDY OBJECTIVES
Primary: Reduction in composite of cardiovascular death and heart failure hospitalization at Week 40.
Secondary: Change in body weight, NT-proBNP levels, Kansas City Cardiomyopathy Score.

2. STUDY POPULATION
Inclusion: Adults 18-80, HFpEF (LVEF >= 40%), BMI >= 30, NYHA Class II-III.
Exclusion: Type 1 diabetes, GLP-1 RA use within 3 months, pancreatitis history, eGFR < 30.

3. VISIT SCHEDULE
Screening (Day -28 to -1): Consent, echocardiogram, 6-minute walk test, fasting labs.
Dose titration: Weeks 1, 2, 4 (escalate from 0.25mg to 0.5mg to 1.0mg).
Maintenance: Every 4 weeks through Week 40.
Fasting labs: Weeks 6, 18, 30 (lipid panel, HbA1c, metabolic panel).

4. GI SIDE EFFECT MANAGEMENT
Nausea is expected in 30-40% of patients during titration.
Do NOT hold dose for mild-moderate nausea. Counsel patient on dietary modifications.
Severe nausea/vomiting: May delay dose escalation by 2 weeks (one delay permitted).
If patient cannot tolerate 0.5mg after two attempts, discontinue study drug.

5. INJECTION TRAINING
First injection administered at site (observed). All subsequent self-administered.
Injection site rotation: abdomen, thigh, upper arm. Record site at each visit.
Provide patient injection diary and review at each visit.""",
    },
    {
        "trial_id": "NCT05891234",
        "site_id": "site_sinai",
        "name": "RESOLVE-NASH Mount Sinai Site Amendment v1.0",
        "version": "1.0",
        "content": """Mount Sinai Site-Specific Amendment — RESOLVE-NASH

This amendment applies ONLY to the Mount Sinai site (Site 1042).

1. LOCAL IRB REQUIREMENTS
Protocol deviation reports must be submitted within 48 hours (stricter than sponsor's 72-hour requirement).
Annual continuing review: submit 60 days before expiration (not 45 days as per sponsor SOP).

2. PHARMACY PROCEDURES
Study drug stored in Sinai Research Pharmacy, Annenberg Building Room 12-42.
Dispensing requires 48-hour advance notice to pharmacy.
After-hours access: Contact on-call pharmacist via hospital operator.

3. LOCAL LAB PROCEDURES
Fasting labs processed at Sinai Clinical Lab (not Quest). Use Sinai-specific requisition forms.
Critical lab values (ALT > 5x ULN): Lab calls PI directly AND CRC per Sinai policy.

4. RECRUITMENT
Hepatology clinic referral pathway established with Dr. Friedman's team.
GI clinic screens: flag patients with FIB-4 > 1.3 and CAP > 280 for potential eligibility.""",
    },
]


class PatientDatabase:
    """In-memory database for development. Production uses Supabase."""

    def __init__(self, seed: int = 42):
        random.seed(seed)

        self.organizations = ORGANIZATIONS
        self.sites = SITES
        self.trials = TRIALS
        self.site_trial_enrollments = SITE_TRIAL_ENROLLMENTS
        self.knowledge_base = KNOWLEDGE_BASE
        self.patients: list[dict] = []
        self.interventions: list[dict] = []
        self.data_queries: list[dict] = []
        self.monitoring_visits: list[dict] = []
        self.protocols: list[dict] = []
        self.tasks: list[dict] = []
        self.patient_notes: list[dict] = []

        # Build trial lookup
        trial_map = {t["trial_id"]: t for t in TRIALS}
        site_map = {s["site_id"]: s for s in SITES}

        # Generate patients per site-trial enrollment
        for enrollment in SITE_TRIAL_ENROLLMENTS:
            trial = trial_map[enrollment["trial_id"]]
            site = site_map[enrollment["site_id"]]
            for i in range(1, enrollment["enrolled"] + 1):
                self.patients.append(generate_patient(trial, site, i))

        # Generate interventions for all patients
        for patient in self.patients:
            interventions = _generate_interventions(patient)
            patient["interventions"] = interventions
            self.interventions.extend(interventions)

        # Generate data queries
        self.data_queries = _generate_data_queries(self.patients)

        # Generate monitoring visits
        self.monitoring_visits = _generate_monitoring_visits(SITES)

        # Seed protocols
        for i, proto in enumerate(PROTOCOL_SNIPPETS):
            chunks = self._chunk_protocol(proto["content"])
            self.protocols.append({
                "id": f"proto_{_uid()}",
                "trial_id": proto["trial_id"],
                "site_id": proto["site_id"],
                "name": proto["name"],
                "version": proto["version"],
                "upload_date": (datetime.now() - timedelta(days=random.randint(10, 90))).strftime("%Y-%m-%d"),
                "uploaded_by": "System (seed data)",
                "chunks": chunks,
            })

        random.seed()  # Reset seed

    def _chunk_protocol(self, content: str) -> list[dict]:
        """Split protocol text into searchable chunks by section headers."""
        lines = content.strip().split("\n")
        chunks = []
        current_header = "Overview"
        current_lines = []

        for line in lines:
            stripped = line.strip()
            # Detect section headers (lines starting with a number followed by period)
            if stripped and stripped[0].isdigit() and ". " in stripped[:5]:
                if current_lines:
                    chunks.append({
                        "id": f"chunk_{_uid()}",
                        "header": current_header,
                        "content": "\n".join(current_lines).strip(),
                    })
                current_header = stripped
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            chunks.append({
                "id": f"chunk_{_uid()}",
                "header": current_header,
                "content": "\n".join(current_lines).strip(),
            })

        return chunks

    def summary(self, site_id: str | None = None) -> dict:
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
        for site in SITES:
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
