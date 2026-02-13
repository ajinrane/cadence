"""
Knowledge repository — all 3 tiers in one table + vector search.
Replaces keyword matching with pgvector cosine similarity.
"""

import uuid
from datetime import datetime, timedelta

from .base import BaseRepository


class KnowledgeRepository(BaseRepository):

    async def search(self, query: str, site_id: str = None, tier: int = None,
                     category: str = None, limit: int = 10) -> list[dict]:
        """RAG-enabled search: embed query → vector similarity with tier/site weighting.
        Falls back to keyword search if embeddings are unavailable."""
        if self.embeddings:
            try:
                return await self._vector_search(query, site_id, tier, category, limit)
            except Exception:
                pass
        return await self._keyword_search(query, site_id, tier, category, limit)

    async def _vector_search(self, query: str, site_id: str = None, tier: int = None,
                             category: str = None, limit: int = 10) -> list[dict]:
        """Vector similarity search with tier weighting + site boost."""
        query_vec = await self.embeddings.embed(query)
        pgvec = self.embeddings.to_pgvector(query_vec)

        conditions = ["status != 'archived'", "embedding IS NOT NULL"]
        args = [pgvec]
        i = 2

        if tier is not None:
            conditions.append(f"tier = ${i}")
            args.append(tier)
            i += 1
        if category:
            conditions.append(f"category = ${i}")
            args.append(category)
            i += 1

        # Site boost param
        site_param = site_id or ""
        args.append(site_param)
        site_idx = i
        i += 1

        args.append(limit)
        limit_idx = i

        where = " AND ".join(conditions)

        rows = await self._fetch(
            f"""SELECT *,
                (1 - (embedding <=> $1::vector)) *
                  CASE tier WHEN 2 THEN 1.5 WHEN 3 THEN 1.3 ELSE 1.0 END
                + CASE WHEN site_id = ${site_idx} THEN 0.3 ELSE 0.0 END
                + CASE WHEN effectiveness_score > 0.7 THEN 0.1 ELSE 0.0 END
                + CASE WHEN confidence > 0.85 THEN 0.1 ELSE 0.0 END
                AS relevance_score
                FROM knowledge_entries
                WHERE {where}
                ORDER BY relevance_score DESC
                LIMIT ${limit_idx}""",
            *args,
        )
        return [self._format_entry(r) for r in rows]

    async def _keyword_search(self, query: str, site_id: str = None, tier: int = None,
                              category: str = None, limit: int = 10) -> list[dict]:
        """Fallback keyword search (same logic as KnowledgeRetriever)."""
        conditions = ["status != 'archived'"]
        args = []
        i = 1

        if tier is not None:
            conditions.append(f"tier = ${i}")
            args.append(tier)
            i += 1
        if category:
            conditions.append(f"category = ${i}")
            args.append(category)
            i += 1

        where = " AND ".join(conditions)
        rows = await self._fetch(
            f"SELECT * FROM knowledge_entries WHERE {where}", *args
        )

        # Score in Python
        words = query.lower().split()
        scored = []
        for row in rows:
            entry = self._format_entry(row)
            text = f"{entry['content']} {' '.join(entry.get('tags', []))} {entry['category']} {entry.get('subcategory', '')} {entry.get('therapeutic_area', '')} {entry.get('source', '')}".lower()
            matches = sum(1 for w in words if w in text)
            if matches > 0:
                # Apply tier weighting
                base_score = matches / len(words)
                tier_weight = {1: 1.0, 2: 1.5, 3: 1.3}.get(entry["tier"], 1.0)
                site_boost = 0.3 if entry.get("site_id") == site_id else 0.0
                entry["relevance_score"] = base_score * tier_weight + site_boost
                scored.append(entry)

        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored[:limit]

    async def get_entries(self, tier: int = None, site_id: str = None,
                          category: str = None) -> list[dict]:
        """Browse entries without search query."""
        conditions = ["status != 'archived'"]
        args = []
        i = 1

        if tier is not None:
            conditions.append(f"tier = ${i}")
            args.append(tier)
            i += 1
        if site_id:
            conditions.append(f"(site_id = ${i} OR site_id IS NULL)")
            args.append(site_id)
            i += 1
        if category:
            conditions.append(f"category = ${i}")
            args.append(category)
            i += 1

        where = " AND ".join(conditions)
        rows = await self._fetch(
            f"SELECT * FROM knowledge_entries WHERE {where} ORDER BY tier, category, created_at DESC",
            *args,
        )
        return [self._format_entry(r) for r in rows]

    async def get_entry(self, entry_id: str) -> dict | None:
        row = await self._fetchrow(
            "SELECT * FROM knowledge_entries WHERE id = $1", entry_id
        )
        return self._format_entry(row) if row else None

    async def add_site_entry(self, site_id: str, category: str, content: str,
                             source: str = None, author: str = None,
                             trial_id: str = None, tags: list = None) -> dict:
        """Add a Tier 2 site-specific knowledge entry."""
        entry_id = f"site_{uuid.uuid4().hex[:8]}"
        embedding = None
        if self.embeddings:
            try:
                vec = await self.embeddings.embed(content)
                embedding = self.embeddings.to_pgvector(vec)
            except Exception:
                pass

        row = await self._fetchrow(
            """INSERT INTO knowledge_entries
               (id, tier, site_id, category, content, source, author, created_at,
                trial_id, tags, status, last_validated_at, embedding)
               VALUES ($1, 2, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $7, $10)
               RETURNING *""",
            entry_id, site_id, category, content, source, author,
            datetime.now().date(), trial_id, tags or [], embedding,
        )
        return self._format_entry(row)

    async def validate_entry(self, entry_id: str) -> dict | None:
        await self._execute(
            "UPDATE knowledge_entries SET last_validated_at = $1, status = 'active' WHERE id = $2",
            datetime.now().date(), entry_id,
        )
        return await self.get_entry(entry_id)

    async def archive_entry(self, entry_id: str) -> dict | None:
        await self._execute(
            "UPDATE knowledge_entries SET status = 'archived' WHERE id = $1", entry_id
        )
        return await self.get_entry(entry_id)

    async def get_stale_entries(self, site_id: str = None, days: int = 90) -> list[dict]:
        """Entries not validated in the last N days."""
        threshold = (datetime.now() - timedelta(days=days)).date()
        conditions = ["status = 'active'", "tier = 2", "last_validated_at < $1"]
        args = [threshold]
        i = 2

        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)

        where = " AND ".join(conditions)
        rows = await self._fetch(
            f"SELECT * FROM knowledge_entries WHERE {where} ORDER BY last_validated_at",
            *args,
        )
        return [self._format_entry(r) for r in rows]

    async def get_stats(self) -> dict:
        """Aggregate counts by tier/site/category."""
        rows = await self._fetch(
            """SELECT tier, site_id, category, status, count(*) as cnt
               FROM knowledge_entries
               GROUP BY tier, site_id, category, status
               ORDER BY tier, site_id, category"""
        )

        stats = {"by_tier": {}, "by_site": {}, "by_category": {}, "total": 0, "active": 0}
        for r in rows:
            tier = r["tier"]
            site = r["site_id"] or "global"
            cat = r["category"]
            cnt = r["cnt"]

            stats["total"] += cnt
            if r["status"] == "active":
                stats["active"] += cnt

            stats["by_tier"].setdefault(tier, 0)
            stats["by_tier"][tier] += cnt

            stats["by_site"].setdefault(site, 0)
            stats["by_site"][site] += cnt

            stats["by_category"].setdefault(cat, 0)
            stats["by_category"][cat] += cnt

        return stats

    async def track_reference(self, entry_id: str):
        """Increment reference_count and update last_referenced_at."""
        await self._execute(
            """UPDATE knowledge_entries
               SET reference_count = COALESCE(reference_count, 0) + 1,
                   last_referenced_at = $1
               WHERE id = $2""",
            datetime.now().date(), entry_id,
        )

    # ── Suggestions ──────────────────────────────────────────────

    async def get_suggestions(self, site_id: str = None) -> list[dict]:
        conditions = ["status = 'draft'"]
        args = []
        i = 1
        if site_id:
            conditions.append(f"site_id = ${i}")
            args.append(site_id)

        where = " AND ".join(conditions)
        rows = await self._fetch(
            f"SELECT * FROM knowledge_suggestions WHERE {where} ORDER BY confidence DESC",
            *args,
        )
        return [self._format_suggestion(r) for r in rows]

    async def approve_suggestion(self, suggestion_id: str) -> dict | None:
        """Approve → promote to Tier 2 knowledge entry."""
        suggestion = await self._fetchrow(
            "SELECT * FROM knowledge_suggestions WHERE id = $1", suggestion_id
        )
        if not suggestion:
            return None

        # Create knowledge entry from suggestion
        entry = await self.add_site_entry(
            site_id=suggestion["site_id"],
            category=suggestion["category"],
            content=suggestion["content"],
            source=suggestion["source"],
            author=suggestion.get("author"),
            trial_id=suggestion.get("trial_id"),
            tags=suggestion.get("tags", []),
        )

        # Mark suggestion as approved
        await self._execute(
            "UPDATE knowledge_suggestions SET status = 'approved', approved_at = $1 WHERE id = $2",
            datetime.now().date(), suggestion_id,
        )

        return entry

    async def dismiss_suggestion(self, suggestion_id: str) -> dict | None:
        row = await self._fetchrow(
            """UPDATE knowledge_suggestions SET status = 'dismissed', dismissed_at = $1
               WHERE id = $2 RETURNING *""",
            datetime.now().date(), suggestion_id,
        )
        return self._format_suggestion(row) if row else None

    # ── Cross-Site ───────────────────────────────────────────────

    async def cross_site_insights(self, category: str = None,
                                  therapeutic_area: str = None) -> list[dict]:
        conditions = ["tier = 3", "status != 'archived'"]
        args = []
        i = 1

        if category:
            conditions.append(f"category = ${i}")
            args.append(category)
            i += 1
        if therapeutic_area:
            conditions.append(f"(therapeutic_area = ${i} OR therapeutic_area = 'General')")
            args.append(therapeutic_area)

        where = " AND ".join(conditions)
        rows = await self._fetch(
            f"SELECT * FROM knowledge_entries WHERE {where} ORDER BY confidence DESC NULLS LAST",
            *args,
        )
        return [self._format_entry(r) for r in rows]

    # ── Facade helpers ───────────────────────────────────────────

    async def list_all(self) -> list[dict]:
        """Load all knowledge entries for facade preload."""
        rows = await self._fetch("SELECT * FROM knowledge_entries ORDER BY tier, category")
        return [self._format_entry(r) for r in rows]

    # ── Formatters ───────────────────────────────────────────────

    def _format_entry(self, row: dict) -> dict:
        e = dict(row)
        for key in ("created_at", "generated_at", "last_validated_at", "last_referenced_at"):
            if e.get(key) is not None:
                e[key] = str(e[key])
        e.pop("embedding", None)
        e.pop("updated_at", None)
        return e

    def _format_suggestion(self, row: dict) -> dict:
        s = dict(row)
        for key in ("created_at", "approved_at", "dismissed_at"):
            if s.get(key) is not None:
                s[key] = str(s[key])
        s.pop("embedding", None)
        return s
