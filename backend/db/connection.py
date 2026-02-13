"""
Neon Postgres connection pool using asyncpg.
Initialized in FastAPI lifespan, shared across all repositories.
"""

import os
import ssl
import json
import pathlib
from typing import Optional

import asyncpg

_pool: Optional[asyncpg.Pool] = None


async def _init_connection(conn: asyncpg.Connection):
    """Per-connection init: register pgvector codec and JSONB codec."""
    # pgvector: pass vectors as text strings '[0.1,0.2,...]'
    await conn.set_type_codec(
        "vector",
        encoder=lambda v: v,
        decoder=lambda v: v,
        schema="public",
        format="text",
    )
    # JSONB: auto-serialize/deserialize Python dicts/lists
    await conn.set_type_codec(
        "jsonb",
        encoder=lambda v: json.dumps(v),
        decoder=lambda v: json.loads(v),
        schema="pg_catalog",
        format="text",
    )
    await conn.set_type_codec(
        "json",
        encoder=lambda v: json.dumps(v),
        decoder=lambda v: json.loads(v),
        schema="pg_catalog",
        format="text",
    )


async def init_pool() -> asyncpg.Pool:
    """Create the connection pool. Called once at startup."""
    global _pool
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required")

    # Neon requires SSL
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    _pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
        ssl=ssl_context,
        init=_init_connection,
    )
    return _pool


async def get_pool() -> asyncpg.Pool:
    """Get the current pool (must be initialized first)."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")
    return _pool


async def close_pool():
    """Shut down the pool. Called at app teardown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def execute(query: str, *args):
    """Execute a query (INSERT/UPDATE/DELETE)."""
    pool = await get_pool()
    return await pool.execute(query, *args)


async def fetch(query: str, *args) -> list[asyncpg.Record]:
    """Fetch multiple rows."""
    pool = await get_pool()
    return await pool.fetch(query, *args)


async def fetchrow(query: str, *args) -> Optional[asyncpg.Record]:
    """Fetch a single row."""
    pool = await get_pool()
    return await pool.fetchrow(query, *args)


async def fetchval(query: str, *args):
    """Fetch a single value."""
    pool = await get_pool()
    return await pool.fetchval(query, *args)


async def run_schema():
    """Execute schema.sql to create all tables. Idempotent (IF NOT EXISTS)."""
    pool = await get_pool()
    schema_path = pathlib.Path(__file__).parent / "schema.sql"
    schema_sql = schema_path.read_text()
    await pool.execute(schema_sql)


async def is_seeded() -> bool:
    """Check if the database has been seeded."""
    pool = await get_pool()
    row = await pool.fetchrow("SELECT seeded_at FROM _seed_status WHERE id = 1")
    return row is not None and row["seeded_at"] is not None


async def mark_seeded(version: str = "1.0"):
    """Mark the database as seeded."""
    pool = await get_pool()
    await pool.execute(
        """INSERT INTO _seed_status (id, seeded_at, seed_version)
           VALUES (1, NOW(), $1)
           ON CONFLICT (id) DO UPDATE SET seeded_at = NOW(), seed_version = $1""",
        version,
    )
