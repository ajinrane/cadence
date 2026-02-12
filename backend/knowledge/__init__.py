"""
Knowledge Management — Three-tier knowledge infrastructure for Cadence.

Tier 1: Base Knowledge — Foundational CRC knowledge (ships with Cadence)
Tier 2: Site Knowledge — Site-specific knowledge (grows per site)
Tier 3: Cross-Site Intelligence — Patterns across sites
"""

from .base_knowledge import BaseKnowledge
from .site_knowledge import SiteKnowledge
from .cross_site import CrossSiteIntelligence
from .retrieval import KnowledgeRetriever
from .lifecycle import KnowledgeLifecycle
from .pattern_detector import PatternDetector


class KnowledgeManager:
    """Composes all three knowledge tiers with unified search."""

    def __init__(self, db=None):
        self.base = BaseKnowledge()
        self.site = SiteKnowledge(db=db)
        self.cross_site = CrossSiteIntelligence(db=db)
        self.retriever = KnowledgeRetriever(self.base, self.site, self.cross_site)
        self.db = db

        # Lifecycle and pattern detection
        self.lifecycle = KnowledgeLifecycle(self)
        self.pattern_detector = PatternDetector(db, self)

    def search(self, query, site_id=None, tier=None, category=None, limit=10):
        """Unified search across all knowledge tiers."""
        return self.retriever.search(
            query=query, site_id=site_id, tier=tier,
            category=category, limit=limit,
        )

    def add_site_entry(self, site_id, category, content, source,
                       author=None, trial_id=None, tags=None):
        """Add a new Tier 2 site-specific knowledge entry."""
        entry = self.site.add_entry(
            site_id=site_id, category=category, content=content,
            source=source, author=author, trial_id=trial_id, tags=tags,
        )
        # Ensure lifecycle fields on new entry
        from .lifecycle import ensure_lifecycle_fields
        ensure_lifecycle_fields(entry)
        return entry

    def get_entries(self, tier=None, site_id=None, category=None):
        """Get entries, optionally filtered by tier/site/category."""
        results = []
        if tier is None or tier == 1:
            results.extend(self.base.get_entries(category=category))
        if tier is None or tier == 2:
            results.extend(self.site.get_entries(site_id=site_id, category=category))
        if tier is None or tier == 3:
            entries = self.cross_site.get_insights(category=category)
            results.extend(entries)
        return results

    def get_stats(self):
        """Return counts per tier, site, and category."""
        tier1 = self.base.entries
        tier2 = self.site.entries
        tier3 = self.cross_site.entries

        # Per-tier counts
        stats = {
            "total": len(tier1) + len(tier2) + len(tier3),
            "by_tier": {
                1: len(tier1),
                2: len(tier2),
                3: len(tier3),
            },
        }

        # Per-site counts (Tier 2)
        site_counts = {}
        for e in tier2:
            sid = e.get("site_id", "unknown")
            site_counts[sid] = site_counts.get(sid, 0) + 1
        stats["by_site"] = site_counts

        # Per-category counts (all tiers)
        cat_counts = {}
        for e in tier1 + tier2 + tier3:
            cat = e.get("category", "unknown")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        stats["by_category"] = cat_counts

        # Lifecycle stats
        stats["lifecycle"] = self.lifecycle.get_stats()

        # Suggestions count
        stats["suggestions_pending"] = len(self.pattern_detector.get_suggestions())

        return stats
