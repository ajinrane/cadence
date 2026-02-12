"""
Tier 2: Site Knowledge — Site-specific knowledge that grows with each site.

Sources: CRC notes, intervention outcomes, manual entries, system-generated patterns.
Mutable: CRCs can add entries via the Knowledge tab or Cadence chat.
"""

from datetime import datetime

# ── Seed Data ────────────────────────────────────────────────────────────
# Migrated from seed.py KNOWLEDGE_BASE + new site-specific entries.
# ~12-15 entries per site.

SITE_KNOWLEDGE_SEED = [
    # ── Columbia CUMC (site_columbia) ──────────────────────────────────
    {
        "id": "site_001",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "For NASH trials with fasting visits, calling patients 48 hours before the fasting visit reduces no-shows by 40%. Always confirm they understand the fasting window (8 hours minimum).",
        "source": "CRC Maria Gonzalez, RESOLVE-NASH, Columbia, Nov 2025",
        "author": "Maria Gonzalez",
        "created_at": "2025-11-15",
        "trial_id": "NCT05891234",
        "tags": ["fasting", "nash", "pre_call", "no_show"],
        "effectiveness_score": 0.82,
    },
    {
        "id": "site_002",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "Alzheimer's trial participants often rely on caregivers for transportation. When a caregiver cancels, the participant drops out. Always get backup caregiver contact info at enrollment.",
        "source": "CRC David Park, BEACON-AD, Columbia, Oct 2025",
        "author": "David Park",
        "created_at": "2025-10-22",
        "trial_id": "NCT06234567",
        "tags": ["alzheimers", "caregiver", "transportation", "backup_contact"],
        "effectiveness_score": 0.75,
    },
    {
        "id": "site_003",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "workflow",
        "content": "When a patient misses a visit, the protocol allows a 7-day window for most visits. Don't mark as 'missed' until Day 8. Call on Day 1, text on Day 3, escalate to PI on Day 5.",
        "source": "Site SOP, Columbia CUMC, Standard",
        "author": None,
        "created_at": "2025-08-01",
        "trial_id": None,
        "tags": ["missed_visit", "escalation", "visit_window", "sop"],
        "effectiveness_score": None,
    },
    {
        "id": "site_004",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "Columbia's CARDIO-GLP1 patients respond best to SMS reminders over email. Our open rate for SMS is 92% vs 18% for email. Default to SMS for all non-urgent communications.",
        "source": "CRC Lisa Tran, CARDIO-GLP1, Columbia, Dec 2025",
        "author": "Lisa Tran",
        "created_at": "2025-12-03",
        "trial_id": "NCT06789012",
        "tags": ["sms", "communication", "glp1", "reminders"],
        "effectiveness_score": 0.88,
    },
    {
        "id": "site_005",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "protocol_tip",
        "content": "For RESOLVE-NASH, the liver biopsy at Week 24 is the highest-dropout visit. Schedule a pre-biopsy counseling call at Week 22 to walk patients through the procedure, address fears, and confirm transportation.",
        "source": "CRC Maria Gonzalez, RESOLVE-NASH, Columbia, Jan 2026",
        "author": "Maria Gonzalez",
        "created_at": "2026-01-10",
        "trial_id": "NCT05891234",
        "tags": ["nash", "liver_biopsy", "counseling", "week_24"],
        "effectiveness_score": 0.79,
    },
    {
        "id": "site_006",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "lesson_learned",
        "content": "We lost 3 BEACON-AD patients in December due to caregiver holiday travel. Now we proactively schedule November and January visits to bracket the holiday gap. Lesson: anticipate seasonal caregiver availability.",
        "source": "CRC David Park, Columbia, Jan 2026",
        "author": "David Park",
        "created_at": "2026-01-15",
        "trial_id": "NCT06234567",
        "tags": ["seasonal", "holidays", "caregiver", "alzheimers", "planning"],
        "effectiveness_score": None,
    },
    {
        "id": "site_007",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "onboarding",
        "content": "New CRCs at Columbia should shadow for 2 weeks minimum. Key: sit in on at least 3 consent discussions, 2 monitoring visits, and 1 PI review meeting before managing patients independently.",
        "source": "Site Training Manual, Columbia CUMC",
        "author": None,
        "created_at": "2025-07-01",
        "trial_id": None,
        "tags": ["onboarding", "training", "shadowing", "new_crc"],
        "effectiveness_score": None,
    },
    {
        "id": "site_008",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "intervention_pattern",
        "content": "Phone calls to high-risk patients at Columbia have a 78% positive outcome rate when made within 48 hours of a risk score increase. Waiting beyond 72 hours drops effectiveness to 45%.",
        "source": "Cadence analytics, Columbia, Feb 2026",
        "author": "System",
        "created_at": "2026-02-01",
        "trial_id": None,
        "tags": ["phone_call", "timing", "risk_score", "effectiveness"],
        "effectiveness_score": 0.78,
    },
    {
        "id": "site_009",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "workflow",
        "content": "Columbia pharmacy requires 72-hour lead time for study drug dispensing. For CARDIO-GLP1 titration visits, submit drug orders by Wednesday for Monday visits. Late orders cause visit delays and patient frustration.",
        "source": "CRC Lisa Tran, Columbia, Nov 2025",
        "author": "Lisa Tran",
        "created_at": "2025-11-20",
        "trial_id": "NCT06789012",
        "tags": ["pharmacy", "study_drug", "lead_time", "glp1"],
        "effectiveness_score": None,
    },
    {
        "id": "site_010",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "Offering parking validation at Columbia's Milstein garage saves patients $25-40 per visit. Patients who receive parking support have 15% better retention than those who don't. Process: validate at front desk before visit.",
        "source": "CRC Maria Gonzalez, Columbia, Sep 2025",
        "author": "Maria Gonzalez",
        "created_at": "2025-09-15",
        "trial_id": None,
        "tags": ["parking", "financial", "retention", "access"],
        "effectiveness_score": 0.72,
    },
    {
        "id": "site_011",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "retention_strategy",
        "content": "For patients expressing frustration with BEACON-AD visit frequency (biweekly infusions), showing them a visual countdown of remaining visits reduces early termination requests by 30%. Use the 'milestones' approach.",
        "source": "CRC David Park, Columbia, Dec 2025",
        "author": "David Park",
        "created_at": "2025-12-18",
        "trial_id": "NCT06234567",
        "tags": ["visit_frequency", "motivation", "milestones", "alzheimers"],
        "effectiveness_score": 0.71,
    },
    {
        "id": "site_012",
        "tier": 2,
        "site_id": "site_columbia",
        "category": "protocol_tip",
        "content": "CARDIO-GLP1 Week 6 fasting labs require 10-hour fasting window. Many patients assume 8 hours (standard). Send a custom text reminder specifying '10-hour fast, water only' 48 hours before the visit.",
        "source": "CRC Lisa Tran, Columbia, Oct 2025",
        "author": "Lisa Tran",
        "created_at": "2025-10-12",
        "trial_id": "NCT06789012",
        "tags": ["fasting", "glp1", "labs", "reminder"],
        "effectiveness_score": 0.85,
    },

    # ── VA Long Beach (site_va_lb) ────────────────────────────────────
    {
        "id": "site_013",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "VA patients often have multiple comorbidities and VA appointments competing for time. Coordinate with primary care scheduler to avoid double-booking days. Consolidating visits increases retention by 20%.",
        "source": "CRC Janet Flores, VA Long Beach, Sep 2025",
        "author": "Janet Flores",
        "created_at": "2025-09-10",
        "trial_id": None,
        "tags": ["va", "comorbidities", "scheduling", "coordination"],
        "effectiveness_score": 0.76,
    },
    {
        "id": "site_014",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "protocol_tip",
        "content": "VA pharmacy turnaround for study drug dispensing is 48-72 hours longer than academic sites. Order refills a full week before the patient visit, not 3 days.",
        "source": "CRC Tom Nguyen, VA Long Beach, Aug 2025",
        "author": "Tom Nguyen",
        "created_at": "2025-08-22",
        "trial_id": None,
        "tags": ["va", "pharmacy", "study_drug", "turnaround"],
        "effectiveness_score": None,
    },
    {
        "id": "site_015",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "For Alzheimer's patients at the VA, the caregiver is often a spouse who is also a veteran. Offer joint scheduling — they can both attend VA on the same day. Reduces missed visits by 35%.",
        "source": "CRC Janet Flores, BEACON-AD, VA, Nov 2025",
        "author": "Janet Flores",
        "created_at": "2025-11-05",
        "trial_id": "NCT06234567",
        "tags": ["alzheimers", "caregiver", "va", "joint_scheduling"],
        "effectiveness_score": 0.83,
    },
    {
        "id": "site_016",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "workflow",
        "content": "VA Long Beach research parking is limited to Lot B (Building 126). Give patients specific lot directions at enrollment — GPS often routes to the main entrance, which adds a 15-minute walk. Confusion with parking causes late arrivals and visit delays.",
        "source": "CRC Tom Nguyen, VA Long Beach, Jul 2025",
        "author": "Tom Nguyen",
        "created_at": "2025-07-15",
        "trial_id": None,
        "tags": ["va", "parking", "directions", "logistics"],
        "effectiveness_score": None,
    },
    {
        "id": "site_017",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "VA CARDIO-GLP1 patients on multiple VA medications benefit from having our pharmacist review drug interactions at enrollment. This caught 3 interactions in Q4 2025 that would have caused AEs and potential dropout.",
        "source": "CRC Janet Flores, CARDIO-GLP1, VA, Jan 2026",
        "author": "Janet Flores",
        "created_at": "2026-01-08",
        "trial_id": "NCT06789012",
        "tags": ["glp1", "polypharmacy", "drug_interactions", "pharmacist"],
        "effectiveness_score": 0.91,
    },
    {
        "id": "site_018",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "lesson_learned",
        "content": "We had 2 protocol deviations in BEACON-AD because MRI scheduling at VA takes 3 weeks, not 1. Now we pre-book MRI slots 4 weeks ahead for every 12-week imaging visit. Zero MRI-related deviations since.",
        "source": "CRC Tom Nguyen, BEACON-AD, VA, Oct 2025",
        "author": "Tom Nguyen",
        "created_at": "2025-10-30",
        "trial_id": "NCT06234567",
        "tags": ["mri", "scheduling", "deviation", "alzheimers", "imaging"],
        "effectiveness_score": None,
    },
    {
        "id": "site_019",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "onboarding",
        "content": "New CRCs at the VA must complete VA-specific training: CPRS/VistA system, VA privacy (different from HIPAA), and VA Research Service SOPs. Budget 1 extra week for VA onboarding beyond standard CRC training.",
        "source": "Site Training Manual, VA Long Beach Research",
        "author": None,
        "created_at": "2025-06-01",
        "trial_id": None,
        "tags": ["va", "onboarding", "cprs", "training"],
        "effectiveness_score": None,
    },
    {
        "id": "site_020",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "intervention_pattern",
        "content": "Transport arrangement is the most effective intervention at VA Long Beach — 91% of patients who received transport assistance remained in the trial vs 64% without. Many VA patients are older, don't drive, and live 20+ miles from site.",
        "source": "Cadence analytics, VA Long Beach, Feb 2026",
        "author": "System",
        "created_at": "2026-02-01",
        "trial_id": None,
        "tags": ["transportation", "effectiveness", "va", "elderly"],
        "effectiveness_score": 0.91,
    },
    {
        "id": "site_021",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "retention_strategy",
        "content": "VA patients value peer connection. We started a monthly 'research participant coffee hour' (no clinical discussion, just social). Attendance correlates with 25% better retention — patients who attend are more engaged overall.",
        "source": "CRC Janet Flores, VA Long Beach, Dec 2025",
        "author": "Janet Flores",
        "created_at": "2025-12-20",
        "trial_id": None,
        "tags": ["peer_support", "community", "engagement", "va"],
        "effectiveness_score": 0.68,
    },
    {
        "id": "site_022",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "protocol_tip",
        "content": "For CARDIO-GLP1 fasting labs at the VA, schedule patients for the 7:30 AM slot. VA lab opens at 7:00 and the first 3 slots have no wait. After 9 AM, wait times exceed 45 minutes and patients leave.",
        "source": "CRC Tom Nguyen, VA Long Beach, Nov 2025",
        "author": "Tom Nguyen",
        "created_at": "2025-11-12",
        "trial_id": "NCT06789012",
        "tags": ["fasting", "lab", "scheduling", "va", "glp1"],
        "effectiveness_score": 0.80,
    },
    {
        "id": "site_023",
        "tier": 2,
        "site_id": "site_va_lb",
        "category": "workflow",
        "content": "VA IRB (technically the VA R&D Committee) has a separate approval track from university IRBs. Amendments take 4-6 weeks minimum. For multi-site amendments, start VA paperwork the same day the sponsor issues the amendment — don't wait for the coordinating center.",
        "source": "Site SOP, VA Long Beach Research",
        "author": None,
        "created_at": "2025-08-01",
        "trial_id": None,
        "tags": ["va", "irb", "amendments", "r_and_d_committee"],
        "effectiveness_score": None,
    },

    # ── Mount Sinai (site_sinai) ──────────────────────────────────────
    {
        "id": "site_024",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "retention_strategy",
        "content": "Mount Sinai NASH patients respond well to text message reminders 24 hours before visits. Email reminders alone have a 15% open rate here — always use SMS as primary channel.",
        "source": "CRC Rachel Kim, RESOLVE-NASH, Sinai, Dec 2025",
        "author": "Rachel Kim",
        "created_at": "2025-12-05",
        "trial_id": "NCT05891234",
        "tags": ["sms", "nash", "reminders", "communication"],
        "effectiveness_score": 0.84,
    },
    {
        "id": "site_025",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "workflow",
        "content": "Sinai's IRB requires 48-hour turnaround for protocol deviation reports. Log deviations same-day and submit within 24 hours to avoid audit findings.",
        "source": "Site SOP, Mount Sinai, Standard",
        "author": None,
        "created_at": "2025-07-01",
        "trial_id": None,
        "tags": ["irb", "deviation", "reporting", "sop"],
        "effectiveness_score": None,
    },
    {
        "id": "site_026",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "retention_strategy",
        "content": "Mount Sinai serves a diverse patient population — 40% of our trial patients prefer non-English communication. We maintain a language preference card for each patient and pre-book interpreters for every visit. Interpreter no-shows cause cascade cancellations.",
        "source": "CRC Rachel Kim, Mount Sinai, Oct 2025",
        "author": "Rachel Kim",
        "created_at": "2025-10-18",
        "trial_id": None,
        "tags": ["language", "interpreter", "diversity", "communication"],
        "effectiveness_score": 0.77,
    },
    {
        "id": "site_027",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "protocol_tip",
        "content": "For RESOLVE-NASH at Sinai, the Week 52 liver biopsy has better attendance when scheduled on Thursdays — patients can recover over the weekend. Monday/Tuesday biopsies have 20% higher cancellation rates.",
        "source": "CRC Sarah Okafor, RESOLVE-NASH, Sinai, Jan 2026",
        "author": "Sarah Okafor",
        "created_at": "2026-01-12",
        "trial_id": "NCT05891234",
        "tags": ["liver_biopsy", "scheduling", "nash", "recovery"],
        "effectiveness_score": 0.73,
    },
    {
        "id": "site_028",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "retention_strategy",
        "content": "Sinai CARDIO-GLP1 patients on the highest dose titration (2.4mg) have 3x more GI complaints. We now schedule a nurse call at Day 3 post-titration to coach on symptom management. This cut titration-related dropout from 18% to 5%.",
        "source": "CRC Sarah Okafor, CARDIO-GLP1, Sinai, Dec 2025",
        "author": "Sarah Okafor",
        "created_at": "2025-12-22",
        "trial_id": "NCT06789012",
        "tags": ["glp1", "titration", "gi_symptoms", "nurse_call"],
        "effectiveness_score": 0.89,
    },
    {
        "id": "site_029",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "lesson_learned",
        "content": "We lost 2 NASH patients when their insurance changed mid-trial and they assumed trial visits would cost money. Now we proactively discuss insurance changes at every visit and reassure patients that trial procedures are covered regardless of insurance status.",
        "source": "CRC Rachel Kim, RESOLVE-NASH, Sinai, Nov 2025",
        "author": "Rachel Kim",
        "created_at": "2025-11-28",
        "trial_id": "NCT05891234",
        "tags": ["insurance", "financial", "nash", "reassurance"],
        "effectiveness_score": None,
    },
    {
        "id": "site_030",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "onboarding",
        "content": "New CRCs at Sinai should get EPIC access on Day 1 and complete GCP certification before patient contact. Our PI Dr. Patel requires all CRCs to present at least one case at weekly team meeting within their first month.",
        "source": "Site Training Manual, Mount Sinai CRC",
        "author": None,
        "created_at": "2025-06-15",
        "trial_id": None,
        "tags": ["onboarding", "epic", "gcp", "training"],
        "effectiveness_score": None,
    },
    {
        "id": "site_031",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "intervention_pattern",
        "content": "Schedule accommodation is the top-performing intervention at Sinai — patients offered flexible evening/weekend slots have 85% positive outcomes. Our patient population skews younger and working, so daytime-only visits are a major barrier.",
        "source": "Cadence analytics, Mount Sinai, Feb 2026",
        "author": "System",
        "created_at": "2026-02-01",
        "trial_id": None,
        "tags": ["schedule_accommodation", "flexibility", "working_patients"],
        "effectiveness_score": 0.85,
    },
    {
        "id": "site_032",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "workflow",
        "content": "Sinai's research pharmacy is on the 3rd floor of Annenberg, not the main hospital pharmacy. New patients often go to the wrong pharmacy and wait 30+ minutes before being redirected. Add clear directions to the enrollment packet.",
        "source": "CRC Rachel Kim, Mount Sinai, Aug 2025",
        "author": "Rachel Kim",
        "created_at": "2025-08-10",
        "trial_id": None,
        "tags": ["pharmacy", "directions", "logistics", "new_patients"],
        "effectiveness_score": None,
    },
    {
        "id": "site_033",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "retention_strategy",
        "content": "For CARDIO-GLP1 patients who report nausea, our most effective approach is a structured 'nausea management kit' given at enrollment: ginger candies, anti-nausea dietary guide, and a symptom diary. Patients who use it have 40% fewer GI complaints.",
        "source": "CRC Sarah Okafor, CARDIO-GLP1, Sinai, Jan 2026",
        "author": "Sarah Okafor",
        "created_at": "2026-01-20",
        "trial_id": "NCT06789012",
        "tags": ["glp1", "nausea", "management_kit", "proactive"],
        "effectiveness_score": 0.81,
    },
    {
        "id": "site_034",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "protocol_tip",
        "content": "Mount Sinai's imaging center requires 2-week advance booking for cardiac MRIs. For CARDIO-GLP1 imaging visits, book the MRI slot when scheduling the patient visit, not after. We had 4 rescheduled visits in Q3 due to imaging unavailability.",
        "source": "CRC Sarah Okafor, Sinai, Oct 2025",
        "author": "Sarah Okafor",
        "created_at": "2025-10-25",
        "trial_id": "NCT06789012",
        "tags": ["imaging", "mri", "scheduling", "cardiac", "advance_booking"],
        "effectiveness_score": None,
    },
    {
        "id": "site_035",
        "tier": 2,
        "site_id": "site_sinai",
        "category": "lesson_learned",
        "content": "Sinai's NASH screening failure rate dropped from 45% to 28% after we added a pre-screening FIB-4 check at the hepatology clinic referral stage. Catches ineligible patients before they invest time in the full screening visit.",
        "source": "CRC Rachel Kim, RESOLVE-NASH, Sinai, Feb 2026",
        "author": "Rachel Kim",
        "created_at": "2026-02-05",
        "trial_id": "NCT05891234",
        "tags": ["screening", "fib4", "nash", "efficiency", "referral"],
        "effectiveness_score": None,
    },
]


class SiteKnowledge:
    """Tier 2: Site-specific knowledge that grows with each site."""

    def __init__(self, db=None):
        self.entries = list(SITE_KNOWLEDGE_SEED)
        self.db = db
        self._next_id = len(self.entries) + 1

    def get_entries(self, site_id=None, category=None):
        results = self.entries
        if site_id:
            results = [e for e in results if e["site_id"] == site_id]
        if category:
            results = [e for e in results if e["category"] == category]
        return results

    def add_entry(self, site_id, category, content, source,
                  author=None, trial_id=None, tags=None):
        """Add a new site-specific knowledge entry."""
        entry = {
            "id": f"site_{self._next_id:03d}",
            "tier": 2,
            "site_id": site_id,
            "category": category,
            "content": content,
            "source": source,
            "author": author,
            "created_at": datetime.now().strftime("%Y-%m-%d"),
            "trial_id": trial_id,
            "tags": tags or [],
            "effectiveness_score": None,
        }
        self.entries.append(entry)
        self._next_id += 1
        return entry

    def get_categories(self, site_id=None):
        entries = self.get_entries(site_id=site_id)
        return sorted(set(e["category"] for e in entries))

    def search(self, query, site_id=None):
        """Keyword search within site knowledge."""
        words = query.lower().split()
        entries = self.get_entries(site_id=site_id)
        results = []
        for entry in entries:
            text = f"{entry['content']} {' '.join(entry.get('tags', []))} {entry['category']} {entry.get('source', '')}".lower()
            matches = sum(1 for w in words if w in text)
            if matches > 0:
                results.append({**entry, "_score": matches / len(words)})
        return sorted(results, key=lambda x: x["_score"], reverse=True)

    def compute_effectiveness(self, site_id=None):
        """Compute intervention effectiveness from actual outcome data."""
        if not self.db:
            return {}
        interventions = self.db.interventions
        if site_id:
            interventions = [i for i in interventions if i["site_id"] == site_id]

        by_type = {}
        for intv in interventions:
            t = intv["type"]
            if t not in by_type:
                by_type[t] = {"total": 0, "positive": 0}
            by_type[t]["total"] += 1
            if intv["outcome"] == "positive":
                by_type[t]["positive"] += 1

        return {
            t: round(v["positive"] / max(v["total"], 1), 2)
            for t, v in by_type.items()
        }
