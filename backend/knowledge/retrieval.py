"""
Knowledge Retrieval — Unified search across all three knowledge tiers.

Scoring: keyword match + tier weighting + site relevance boost.
Tier 2 (site-specific) gets highest weight because it's most actionable.
"""


class KnowledgeRetriever:
    """Unified search across all knowledge tiers."""

    # Tier weights: site knowledge > cross-site > base
    TIER_WEIGHTS = {1: 1.0, 2: 1.5, 3: 1.3}
    SITE_BOOST = 0.3  # Boost for entries matching the queried site

    def __init__(self, base_knowledge, site_knowledge, cross_site):
        self.base = base_knowledge
        self.site = site_knowledge
        self.cross_site = cross_site

    def search(self, query, site_id=None, tier=None, category=None, limit=10):
        """
        Search across all tiers with weighted ranking.

        Args:
            query: Search text
            site_id: Optional site filter (also boosts site-relevant results)
            tier: Optional tier filter (1, 2, or 3)
            category: Optional category filter
            limit: Max results to return

        Returns:
            List of entries with relevance_score, sorted by relevance
        """
        if not query or not query.strip():
            return self._browse(site_id=site_id, tier=tier, category=category, limit=limit)

        words = query.lower().split()
        all_results = []

        # Search each tier
        if tier is None or tier == 1:
            for entry in self.base.entries:
                score = self._score_entry(entry, words, site_id)
                if score > 0:
                    all_results.append({**entry, "relevance_score": score})

        if tier is None or tier == 2:
            entries = self.site.entries
            if site_id:
                # Include site-specific + entries without site_id
                entries = [e for e in entries
                           if e.get("site_id") == site_id or not e.get("site_id")]
            for entry in entries:
                score = self._score_entry(entry, words, site_id)
                if score > 0:
                    all_results.append({**entry, "relevance_score": score})

        if tier is None or tier == 3:
            for entry in self.cross_site.entries:
                score = self._score_entry(entry, words, site_id)
                if score > 0:
                    all_results.append({**entry, "relevance_score": score})

        # Apply category filter
        if category:
            all_results = [r for r in all_results if r.get("category") == category]

        # Sort by relevance and return top N
        all_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return all_results[:limit]

    def _score_entry(self, entry, words, site_id=None):
        """Score a single entry against the query words."""
        # Build searchable text from all relevant fields
        text_parts = [
            entry.get("content", ""),
            entry.get("category", ""),
            entry.get("subcategory", ""),
            entry.get("therapeutic_area", ""),
            entry.get("source", ""),
            " ".join(entry.get("tags", [])),
        ]
        text = " ".join(text_parts).lower()

        # Count word matches
        matches = sum(1 for w in words if w in text)
        if matches == 0:
            return 0

        # Base score: fraction of query words matched
        base_score = matches / len(words)

        # Apply tier weight
        tier = entry.get("tier", 1)
        score = base_score * self.TIER_WEIGHTS.get(tier, 1.0)

        # Site relevance boost
        if site_id and entry.get("site_id") == site_id:
            score += self.SITE_BOOST

        # Effectiveness boost for entries with proven results
        if entry.get("effectiveness_score") and entry["effectiveness_score"] > 0.7:
            score += 0.1

        # Confidence boost for cross-site entries
        if entry.get("confidence") and entry["confidence"] > 0.85:
            score += 0.1

        return round(score, 3)

    def _browse(self, site_id=None, tier=None, category=None, limit=10):
        """Browse entries without a search query."""
        results = []

        if tier is None or tier == 1:
            results.extend(self.base.entries)
        if tier is None or tier == 2:
            entries = self.site.entries
            if site_id:
                entries = [e for e in entries if e.get("site_id") == site_id]
            results.extend(entries)
        if tier is None or tier == 3:
            results.extend(self.cross_site.entries)

        if category:
            results = [r for r in results if r.get("category") == category]

        # Add default relevance score for browsing
        for r in results:
            r["relevance_score"] = 0

        return results[:limit]
