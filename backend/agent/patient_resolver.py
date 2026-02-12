"""
Patient Resolver — Fuzzy matching for natural language patient references.

CRCs say "call Maria" or "the NASH patient who missed last week", not
"create task for PT-COL-1234-007". This module resolves those references.

Matching pipeline (short-circuits on exact match):
1. Exact patient_id
2. Partial patient_id (e.g., "007", "COL-1234")
3. Name match (full, last, first, prefix)
4. Contextual match (trial, risk, event, status filters)
5. Site scoping applied throughout
"""


class PatientResolver:
    def __init__(self, db):
        self.db = db

    def resolve(self, query: str, site_id: str = None, context: dict = None) -> dict:
        """
        Resolve a natural language patient reference to patient records.

        Returns:
            {
                "match": "exact"|"single"|"multiple"|"none",
                "patients": [...],
                "confidence": float,
            }
        """
        context = context or {}
        query = query.strip()
        if not query:
            return {"match": "none", "patients": [], "confidence": 0}

        # For ID-based lookups, search ALL patients (not just active)
        all_candidates = self._get_candidates(site_id, active_only=False)

        # 1. Exact patient_id match (any status)
        exact = [p for p in all_candidates if p["patient_id"] == query]
        if exact:
            return {"match": "exact", "patients": exact, "confidence": 1.0}

        # 2. Partial patient_id match (any status)
        query_upper = query.upper()
        partial_id = [p for p in all_candidates if query_upper in p["patient_id"]]
        if len(partial_id) == 1:
            return {"match": "single", "patients": partial_id, "confidence": 0.95}
        if partial_id:
            return {"match": "multiple", "patients": partial_id[:5], "confidence": 0.90}

        # For name/contextual searches, only consider active patients
        candidates = self._get_candidates(site_id)

        # 3. Name match
        name_results = self._name_match(query, candidates)
        if name_results:
            patients, confidence = name_results
            if len(patients) == 1 and confidence >= 0.7:
                return {"match": "single", "patients": patients, "confidence": confidence}
            if len(patients) <= 5:
                return {"match": "multiple", "patients": patients, "confidence": confidence}

        # 4. Contextual match (trial, risk, event, status keywords)
        contextual = self._contextual_match(query, candidates)
        if contextual:
            patients, confidence = contextual
            if len(patients) == 1 and confidence >= 0.6:
                return {"match": "single", "patients": patients, "confidence": confidence}
            if patients:
                return {"match": "multiple", "patients": patients[:5], "confidence": confidence}

        return {"match": "none", "patients": [], "confidence": 0}

    def _get_candidates(self, site_id: str = None, active_only: bool = True) -> list[dict]:
        patients = self.db.patients
        if site_id:
            patients = [p for p in patients if p["site_id"] == site_id]
        if active_only:
            patients = [p for p in patients if p["status"] in ("active", "at_risk")]
        return patients

    def _name_match(self, query: str, candidates: list[dict]):
        """Match against patient names. Returns (patients, confidence) or None."""
        query_lower = query.lower()
        tokens = query_lower.split()

        # Full name match ("Maria Rodriguez")
        if len(tokens) >= 2:
            full_matches = [
                p for p in candidates
                if query_lower == p["name"].lower()
            ]
            if full_matches:
                return full_matches, 0.95

            # Two-token partial: first + last
            first_tok, last_tok = tokens[0], tokens[-1]
            partial_full = [
                p for p in candidates
                if first_tok in p["name"].lower().split()[0]
                and last_tok in p["name"].lower().split()[-1]
            ]
            if partial_full:
                return partial_full, 0.90

        # Single-token name matching
        if len(tokens) == 1:
            token = tokens[0]

            # Exact last name match
            last_matches = [
                p for p in candidates
                if token == p["name"].lower().split()[-1]
            ]
            if last_matches:
                return last_matches, 0.85

            # Exact first name match
            first_matches = [
                p for p in candidates
                if token == p["name"].lower().split()[0]
            ]
            if first_matches:
                return first_matches, 0.75

            # Prefix match (e.g., "Rod" matches "Rodriguez")
            prefix_matches = [
                p for p in candidates
                if any(part.startswith(token) for part in p["name"].lower().split())
            ]
            if prefix_matches:
                return prefix_matches, 0.65

        return None

    def _contextual_match(self, query: str, candidates: list[dict]):
        """Match by trial, risk level, events, or status keywords."""
        query_lower = query.lower()
        results = list(candidates)

        # Trial name keywords
        trial_keywords = {
            "nash": "RESOLVE-NASH",
            "alzheimer": "BEACON-AD",
            "alzheimers": "BEACON-AD",
            "beacon": "BEACON-AD",
            "glp1": "CARDIO-GLP1",
            "glp-1": "CARDIO-GLP1",
            "cardio": "CARDIO-GLP1",
            "heart failure": "CARDIO-GLP1",
            "obesity": "CARDIO-GLP1",
        }
        for keyword, trial_name in trial_keywords.items():
            if keyword in query_lower:
                results = [p for p in results if trial_name in p.get("trial_name", "")]
                break

        # Risk level filter
        if "high risk" in query_lower or "high-risk" in query_lower:
            results = [p for p in results if p["dropout_risk_score"] >= 0.7]
        elif "at risk" in query_lower or "at_risk" in query_lower:
            results = [p for p in results if p["status"] == "at_risk"]

        # Event-based filter
        if "missed" in query_lower and "visit" in query_lower:
            results = [
                p for p in results
                if any(e["type"] == "missed_visit" for e in p.get("events", []))
            ]
        elif "missed" in query_lower:
            results = [
                p for p in results
                if p.get("visits_missed", 0) > 0
            ]

        # Nausea / side effects
        if "nausea" in query_lower or "side effect" in query_lower:
            results = [
                p for p in results
                if any(
                    "nausea" in rf.lower() or "side effect" in rf.lower()
                    for rf in p.get("risk_factors", [])
                )
                or any(
                    e["type"] == "adverse_event_reported"
                    for e in p.get("events", [])
                )
            ]

        # Only return if we actually filtered something
        if len(results) < len(candidates) and results:
            confidence = 0.70 if len(results) <= 3 else 0.55
            return results, confidence

        return None
