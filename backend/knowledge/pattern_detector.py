"""
Pattern Detector — Analyzes intervention outcomes and patient notes
to surface knowledge suggestions for CRC review.

Suggestions are "draft" Tier 2 entries that await CRC approval.
"""

from datetime import datetime


class PatternDetector:
    """Analyzes data patterns and generates knowledge suggestions."""

    def __init__(self, db, knowledge_manager):
        self.db = db
        self.km = knowledge_manager
        self.suggestions: list[dict] = []
        self._next_id = 1
        self._seed_suggestions()

    def _seed_suggestions(self):
        """Seed initial suggestions based on intervention data analysis."""
        seed = [
            # Columbia
            {
                "site_id": "site_columbia",
                "category": "intervention_pattern",
                "content": "Caregiver outreach for BEACON-AD patients at Columbia has a 90% positive outcome rate when initiated within 24 hours of a missed visit. This is significantly higher than the 55% rate for outreach after 48+ hours. Consider making same-day caregiver outreach the default protocol for Alzheimer's missed visits.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — intervention outcome analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["caregiver", "alzheimers", "missed_visit", "timing"],
                "trial_id": "NCT06234567",
                "evidence_count": 12,
                "confidence": 0.82,
            },
            {
                "site_id": "site_columbia",
                "category": "retention_strategy",
                "content": "Columbia patients who receive both an SMS reminder AND a phone call before fasting visits have a 95% attendance rate, compared to 78% for SMS only and 70% for phone only. The combination works significantly better than either channel alone.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — reminder effectiveness analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["sms", "phone", "fasting", "dual_channel", "reminder"],
                "trial_id": None,
                "evidence_count": 34,
                "confidence": 0.88,
            },
            # VA Long Beach
            {
                "site_id": "site_va_lb",
                "category": "intervention_pattern",
                "content": "VA patients who attend the monthly 'research participant coffee hour' and then miss a visit respond to re-engagement calls at a 92% rate, compared to 58% for non-attendees. The social connection creates a stronger bond with the site that aids retention.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — social engagement vs retention analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["peer_support", "community", "retention", "re_engagement"],
                "trial_id": None,
                "evidence_count": 18,
                "confidence": 0.79,
            },
            {
                "site_id": "site_va_lb",
                "category": "workflow",
                "content": "VA patients scheduled before 9:00 AM have 15% fewer protocol deviations related to fasting violations. After 9 AM, many patients inadvertently break their fast due to medication routines. Morning scheduling should be prioritized for all fasting visits.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — deviation analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["fasting", "scheduling", "morning", "deviation"],
                "trial_id": None,
                "evidence_count": 22,
                "confidence": 0.85,
            },
            # Mount Sinai
            {
                "site_id": "site_sinai",
                "category": "retention_strategy",
                "content": "Sinai patients who receive the GLP-1 nausea management kit at enrollment AND a Day 3 nurse call have a combined dropout rate of only 3% during titration, compared to 12% for kit-only and 18% for neither. Both interventions together create the strongest safety net.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — titration dropout analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["glp1", "nausea", "titration", "combined_intervention"],
                "trial_id": "NCT06789012",
                "evidence_count": 28,
                "confidence": 0.91,
            },
            {
                "site_id": "site_sinai",
                "category": "intervention_pattern",
                "content": "At Mount Sinai, schedule accommodation (offering evening/weekend slots) combined with interpreter pre-booking results in 0% no-show rate for non-English-speaking patients. Without both accommodations, the no-show rate is 22%.",
                "source": "seed_data",
                "source_detail": "Cadence pattern detection — access barrier analysis",
                "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
                "tags": ["schedule_accommodation", "interpreter", "language", "access"],
                "trial_id": None,
                "evidence_count": 15,
                "confidence": 0.84,
            },
        ]

        for s in seed:
            self._add_suggestion(s)

    def _add_suggestion(self, data):
        """Create a draft suggestion entry."""
        suggestion = {
            "id": f"suggest_{self._next_id:03d}",
            "tier": 2,
            "status": "draft",
            "site_id": data["site_id"],
            "category": data["category"],
            "content": data["content"],
            "source": data.get("source", "cadence_analysis"),
            "source_detail": data.get("source_detail", ""),
            "ui_note": data.get("ui_note", ""),
            "author": "Cadence AI",
            "created_at": datetime.now().strftime("%Y-%m-%d"),
            "trial_id": data.get("trial_id"),
            "tags": data.get("tags", []),
            "effectiveness_score": None,
            "evidence_count": data.get("evidence_count", 0),
            "confidence": data.get("confidence", 0.0),
        }
        self.suggestions.append(suggestion)
        self._next_id += 1
        return suggestion

    def get_suggestions(self, site_id=None):
        """Get pending suggestions, optionally filtered by site."""
        results = [s for s in self.suggestions if s["status"] == "draft"]
        if site_id:
            results = [s for s in results if s["site_id"] == site_id]
        return sorted(results, key=lambda s: s.get("confidence", 0), reverse=True)

    def approve_suggestion(self, suggestion_id):
        """Approve a suggestion — promotes it to active Tier 2 knowledge."""
        suggestion = next((s for s in self.suggestions if s["id"] == suggestion_id), None)
        if not suggestion:
            return None

        # Add to site knowledge as an active entry
        entry = self.km.add_site_entry(
            site_id=suggestion["site_id"],
            category=suggestion["category"],
            content=suggestion["content"],
            source=suggestion["source"],
            author=suggestion.get("author"),
            trial_id=suggestion.get("trial_id"),
            tags=suggestion.get("tags", []),
        )

        # Mark suggestion as approved
        suggestion["status"] = "approved"
        suggestion["approved_at"] = datetime.now().strftime("%Y-%m-%d")

        return entry

    def dismiss_suggestion(self, suggestion_id):
        """Dismiss a suggestion — marks it as rejected."""
        suggestion = next((s for s in self.suggestions if s["id"] == suggestion_id), None)
        if not suggestion:
            return None
        suggestion["status"] = "dismissed"
        suggestion["dismissed_at"] = datetime.now().strftime("%Y-%m-%d")
        return suggestion

    def analyze_intervention_patterns(self):
        """Analyze intervention outcomes to generate new suggestions.
        In production, this would run periodically. For now, returns summary."""
        if not self.db:
            return {}

        interventions = self.db.interventions
        by_site_type = {}
        for intv in interventions:
            key = (intv["site_id"], intv["type"])
            if key not in by_site_type:
                by_site_type[key] = {"total": 0, "positive": 0}
            by_site_type[key]["total"] += 1
            if intv["outcome"] == "positive":
                by_site_type[key]["positive"] += 1

        patterns = []
        for (site_id, intv_type), counts in by_site_type.items():
            if counts["total"] >= 3:
                rate = counts["positive"] / counts["total"]
                patterns.append({
                    "site_id": site_id,
                    "intervention_type": intv_type,
                    "success_rate": round(rate, 2),
                    "sample_size": counts["total"],
                })

        return {"patterns": sorted(patterns, key=lambda p: p["success_rate"], reverse=True)}
