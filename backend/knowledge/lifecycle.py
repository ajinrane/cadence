"""
Knowledge Lifecycle Manager — Handles status transitions, validation,
staleness detection, and archival across all knowledge tiers.

Entry statuses:
  - active: Current, validated knowledge
  - stale: Hasn't been validated recently (>90 days for Tier 2, >180 for Tier 1)
  - draft: Newly suggested, awaiting CRC approval
  - archived: No longer relevant, kept for history
"""

from datetime import datetime, timedelta


# Staleness thresholds (days since last validation)
STALE_THRESHOLDS = {
    1: 365,   # Tier 1: foundational, rarely changes
    2: 90,    # Tier 2: site knowledge, should be reviewed quarterly
    3: 180,   # Tier 3: cross-site, reviewed biannually
}


def ensure_lifecycle_fields(entry):
    """Add lifecycle fields to an entry if missing."""
    entry.setdefault("status", "active")
    entry.setdefault("last_validated_at", entry.get("created_at") or datetime.now().strftime("%Y-%m-%d"))
    entry.setdefault("reference_count", 0)
    entry.setdefault("last_referenced_at", None)
    return entry


def mark_referenced(entry):
    """Track that this entry was referenced (e.g., returned in a search result)."""
    entry["reference_count"] = entry.get("reference_count", 0) + 1
    entry["last_referenced_at"] = datetime.now().strftime("%Y-%m-%d")


def validate_entry(entry):
    """Mark an entry as validated (reviewed and confirmed current)."""
    entry["status"] = "active"
    entry["last_validated_at"] = datetime.now().strftime("%Y-%m-%d")
    return entry


def archive_entry(entry):
    """Archive an entry (no longer relevant)."""
    entry["status"] = "archived"
    return entry


def is_stale(entry):
    """Check if an entry is stale based on its tier and last validation date."""
    tier = entry.get("tier", 1)
    threshold_days = STALE_THRESHOLDS.get(tier, 180)
    last_validated = entry.get("last_validated_at") or entry.get("created_at")
    if not last_validated:
        return True
    try:
        last_date = datetime.strptime(last_validated, "%Y-%m-%d")
    except (ValueError, TypeError):
        return True
    return (datetime.now() - last_date).days > threshold_days


class KnowledgeLifecycle:
    """Manages the lifecycle of knowledge entries across all tiers."""

    def __init__(self, knowledge_manager):
        self.km = knowledge_manager
        self._init_lifecycle_fields()

    def _init_lifecycle_fields(self):
        """Ensure all existing entries have lifecycle fields."""
        for entry in self.km.base.entries:
            ensure_lifecycle_fields(entry)
        for entry in self.km.site.entries:
            ensure_lifecycle_fields(entry)
        for entry in self.km.cross_site.entries:
            ensure_lifecycle_fields(entry)

    def get_stale_entries(self, site_id=None):
        """Get all entries that need review."""
        stale = []
        for entry in self.km.get_entries(site_id=site_id):
            if entry.get("status") == "archived":
                continue
            if is_stale(entry):
                entry["status"] = "stale"
                stale.append(entry)
        return stale

    def validate(self, entry_id):
        """Mark an entry as validated by its ID."""
        entry = self._find_entry(entry_id)
        if entry:
            validate_entry(entry)
            return entry
        return None

    def archive(self, entry_id):
        """Archive an entry by its ID."""
        entry = self._find_entry(entry_id)
        if entry:
            archive_entry(entry)
            return entry
        return None

    def get_entry(self, entry_id):
        """Find a single entry by ID."""
        return self._find_entry(entry_id)

    def track_reference(self, entry_id):
        """Track that an entry was referenced in a search/chat result."""
        entry = self._find_entry(entry_id)
        if entry:
            mark_referenced(entry)

    def get_stats(self):
        """Get lifecycle stats across all tiers."""
        all_entries = self.km.get_entries()
        stats = {
            "total": len(all_entries),
            "active": 0,
            "stale": 0,
            "draft": 0,
            "archived": 0,
        }
        for entry in all_entries:
            status = entry.get("status", "active")
            if status == "active" and is_stale(entry):
                status = "stale"
            stats[status] = stats.get(status, 0) + 1
        return stats

    def _find_entry(self, entry_id):
        """Find an entry across all tiers by ID."""
        for entry in self.km.base.entries:
            if entry["id"] == entry_id:
                return entry
        for entry in self.km.site.entries:
            if entry["id"] == entry_id:
                return entry
        for entry in self.km.cross_site.entries:
            if entry["id"] == entry_id:
                return entry
        return None
