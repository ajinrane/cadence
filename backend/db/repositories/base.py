"""
Base repository — shared helpers for all domain repositories.
"""

import asyncpg


class BaseRepository:
    def __init__(self, pool: asyncpg.Pool, embeddings=None):
        self.pool = pool
        self.embeddings = embeddings

    async def _fetch(self, query: str, *args) -> list[dict]:
        rows = await self.pool.fetch(query, *args)
        return [dict(r) for r in rows]

    async def _fetchrow(self, query: str, *args) -> dict | None:
        row = await self.pool.fetchrow(query, *args)
        return dict(row) if row else None

    async def _fetchval(self, query: str, *args):
        return await self.pool.fetchval(query, *args)

    async def _execute(self, query: str, *args):
        return await self.pool.execute(query, *args)
