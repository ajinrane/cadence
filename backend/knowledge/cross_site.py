"""
Tier 3: Cross-Site Intelligence — Patterns and insights computed across sites.

Some insights are seeded (static), others are computed dynamically
from Tier 2 data and intervention outcomes.
"""

from datetime import datetime

CROSS_SITE_INSIGHTS = [
    {
        "id": "xsite_001",
        "tier": 3,
        "category": "pattern",
        "content": "Transport assistance is the single most effective intervention across all sites. Patients who receive transport support have 83% retention vs 61% for those without. VA Long Beach sees the highest impact (91% vs 64%) due to its older, non-driving population.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 47,
        "confidence": 0.92,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_002",
        "tier": 3,
        "category": "pattern",
        "content": "GLP-1 trials show a consistent dropout spike at weeks 4-8 across all sites due to GI side effects. Sites that implement proactive nausea management (Sinai's nurse call + management kit) see 60% lower titration-related dropout than sites with reactive management only.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 38,
        "confidence": 0.88,
        "therapeutic_area": "GLP-1",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_003",
        "tier": 3,
        "category": "pattern",
        "content": "SMS reminders outperform email at all three sites. Average SMS open rate: 89% vs email: 16%. Columbia and Sinai show the strongest SMS preference. Recommendation: default all patient reminders to SMS with email as backup.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 290,
        "confidence": 0.95,
        "therapeutic_area": "General",
        "generated_at": "2026-01-15",
    },
    {
        "id": "xsite_004",
        "tier": 3,
        "category": "comparison",
        "content": "NASH liver biopsy dropout: Columbia 22%, Sinai 18%. Sinai's lower rate correlates with their Thursday-scheduling strategy (recovery over weekend) and pre-screening FIB-4 checks that reduce screen failures and build patient confidence in eligibility.",
        "sites_involved": ["site_columbia", "site_sinai"],
        "evidence_count": 24,
        "confidence": 0.78,
        "therapeutic_area": "NASH",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_005",
        "tier": 3,
        "category": "recommendation",
        "content": "Alzheimer's trial best practice from cross-site data: maintain backup caregiver contacts (Columbia), offer joint veteran-spouse scheduling (VA), and pre-book all imaging visits 4 weeks out (VA). Sites implementing all three practices see >85% retention.",
        "sites_involved": ["site_columbia", "site_va_lb"],
        "evidence_count": 31,
        "confidence": 0.85,
        "therapeutic_area": "Alzheimer's",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_006",
        "tier": 3,
        "category": "benchmark",
        "content": "Cross-site retention benchmarks (active trials): Columbia 84%, VA Long Beach 81%, Sinai 86%. Sinai leads due to younger, more engaged patient population and stronger schedule flexibility. VA trails due to transportation barriers despite high intervention quality.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 145,
        "confidence": 0.94,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_007",
        "tier": 3,
        "category": "pattern",
        "content": "Winter months (Dec-Feb) show 15% higher dropout across all sites and all trials. Sites that start proactive outreach in November (pre-calls, transport offers, telehealth options) maintain near-normal retention. Reactive sites see the full seasonal impact.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 89,
        "confidence": 0.91,
        "therapeutic_area": "General",
        "generated_at": "2026-01-01",
    },
    {
        "id": "xsite_008",
        "tier": 3,
        "category": "recommendation",
        "content": "Phone call interventions are most effective when made within 48 hours of a risk score increase. Cross-site data: 72% positive outcome within 48h, drops to 41% after 72h. Automate risk alerts to CRC phones for same-day response.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 156,
        "confidence": 0.89,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_009",
        "tier": 3,
        "category": "comparison",
        "content": "Query resolution speed: Columbia avg 4.2 days, VA 6.8 days, Sinai 3.9 days. VA's slower resolution is driven by VA-specific systems (CPRS/VistA) requiring additional documentation steps. Sinai's fast resolution correlates with their 48-hour deviation reporting SOP creating urgency culture.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 67,
        "confidence": 0.86,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_010",
        "tier": 3,
        "category": "pattern",
        "content": "Patients with 3+ risk factors have a 65% chance of dropout within 8 weeks if no intervention is made, vs 22% if at least one proactive intervention occurs. The type of intervention matters less than the speed — any contact within 48h significantly improves retention.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 203,
        "confidence": 0.93,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
    {
        "id": "xsite_011",
        "tier": 3,
        "category": "recommendation",
        "content": "New CRC onboarding: cross-site data shows that CRCs who shadow for 2+ weeks before independent patient management have 30% fewer protocol deviations in their first quarter. All three sites now mandate 2-week shadowing, but quality of shadowing varies.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 12,
        "confidence": 0.72,
        "therapeutic_area": "General",
        "generated_at": "2026-01-15",
    },
    {
        "id": "xsite_012",
        "tier": 3,
        "category": "benchmark",
        "content": "Intervention success rates by type (cross-site): Phone call 68%, SMS 55%, Email 32%, Transport arranged 83%, Schedule accommodation 79%, PI consultation 71%, Caregiver outreach 74%. System-recommended interventions outperform manual by 15%.",
        "sites_involved": ["site_columbia", "site_va_lb", "site_sinai"],
        "evidence_count": 312,
        "confidence": 0.96,
        "therapeutic_area": "General",
        "generated_at": "2026-02-01",
    },
]


class CrossSiteIntelligence:
    """Tier 3: Cross-site patterns and insights."""

    def __init__(self, db=None):
        self.entries = list(CROSS_SITE_INSIGHTS)
        self.db = db

    def get_insights(self, category=None, therapeutic_area=None):
        results = self.entries
        if category:
            results = [e for e in results if e["category"] == category]
        if therapeutic_area:
            results = [e for e in results if
                       e.get("therapeutic_area") == therapeutic_area or
                       e.get("therapeutic_area") == "General"]
        return results

    def get_benchmarks(self):
        """Return benchmark insights."""
        return [e for e in self.entries if e["category"] == "benchmark"]

    def search(self, query):
        """Keyword search across cross-site insights."""
        words = query.lower().split()
        results = []
        for entry in self.entries:
            text = f"{entry['content']} {entry['category']} {entry.get('therapeutic_area', '')}".lower()
            matches = sum(1 for w in words if w in text)
            if matches > 0:
                results.append({**entry, "_score": matches / len(words)})
        return sorted(results, key=lambda x: x["_score"], reverse=True)

    def compute_insights(self, db):
        """
        Compute dynamic cross-site insights from current data.
        In production, this would run periodically. For now, returns
        live-computed benchmarks alongside static insights.
        """
        if not db:
            return []

        computed = []

        # Compute per-site retention rates
        site_stats = {}
        for site in db.sites:
            sid = site["site_id"]
            patients = [p for p in db.patients if p["site_id"] == sid]
            active = [p for p in patients if p["status"] in ("active", "at_risk")]
            retention = round((len(active) / max(len(patients), 1)) * 100, 1)
            high_risk = len([p for p in active if p["dropout_risk_score"] >= 0.7])
            site_stats[sid] = {
                "name": site["name"],
                "retention": retention,
                "total": len(patients),
                "active": len(active),
                "high_risk": high_risk,
            }

        # Compute per-type intervention effectiveness
        type_outcomes = {}
        for intv in db.interventions:
            t = intv["type"]
            if t not in type_outcomes:
                type_outcomes[t] = {"total": 0, "positive": 0}
            type_outcomes[t]["total"] += 1
            if intv["outcome"] == "positive":
                type_outcomes[t]["positive"] += 1

        effectiveness = {
            t: round(v["positive"] / max(v["total"], 1) * 100, 1)
            for t, v in type_outcomes.items()
            if v["total"] >= 3
        }

        if effectiveness:
            best = max(effectiveness, key=effectiveness.get)
            computed.append({
                "id": "xsite_dynamic_001",
                "tier": 3,
                "category": "benchmark",
                "content": f"Live intervention effectiveness: {', '.join(f'{t}: {v}%' for t, v in sorted(effectiveness.items(), key=lambda x: x[1], reverse=True))}. Most effective: {best} ({effectiveness[best]}%).",
                "sites_involved": list(site_stats.keys()),
                "evidence_count": sum(v["total"] for v in type_outcomes.values()),
                "confidence": 0.90,
                "therapeutic_area": "General",
                "generated_at": datetime.now().strftime("%Y-%m-%d"),
            })

        return computed
