"""
Protocol repository — upload, chunk, embed, and search protocols.
"""

import uuid
from datetime import datetime

from .base import BaseRepository


class ProtocolRepository(BaseRepository):

    async def list_protocols(self, site_id: str = None, trial_id: str = None) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"(p.site_id = ${i} OR p.site_id IS NULL)")
            args.append(site_id)
            i += 1
        if trial_id:
            conditions.append(f"p.trial_id = ${i}")
            args.append(trial_id)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        protocols = await self._fetch(
            f"SELECT * FROM protocols p {where} ORDER BY upload_date DESC", *args
        )

        result = []
        for proto in protocols:
            p = self._format_protocol(proto)
            # Fetch chunks
            chunks = await self._fetch(
                "SELECT id, header, content FROM protocol_chunks WHERE protocol_id = $1 ORDER BY id",
                proto["id"],
            )
            p["chunks"] = [dict(c) for c in chunks]
            result.append(p)

        return result

    async def upload(self, content: str, name: str, trial_id: str,
                     site_id: str = None, version: str = "1.0",
                     uploaded_by: str = "CRC") -> dict:
        """Upload protocol: chunk → embed → insert."""
        proto_id = f"proto_{uuid.uuid4().hex[:8]}"

        row = await self._fetchrow(
            """INSERT INTO protocols (id, trial_id, site_id, name, version, upload_date, uploaded_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            proto_id, trial_id, site_id, name, version,
            datetime.now().date(), uploaded_by,
        )

        # Chunk the content
        chunks = self._chunk(content)

        # Embed all chunks
        chunk_texts = [f"{c['header']}\n{c['content']}" for c in chunks]
        embeddings_list = [None] * len(chunks)
        if self.embeddings:
            try:
                vecs = await self.embeddings.embed_batch(chunk_texts)
                embeddings_list = [self.embeddings.to_pgvector(v) for v in vecs]
            except Exception:
                pass

        # Insert chunks
        inserted_chunks = []
        for j, chunk in enumerate(chunks):
            chunk_id = f"chunk_{uuid.uuid4().hex[:8]}"
            await self._execute(
                """INSERT INTO protocol_chunks (id, protocol_id, header, content, embedding)
                   VALUES ($1, $2, $3, $4, $5)""",
                chunk_id, proto_id, chunk["header"], chunk["content"],
                embeddings_list[j],
            )
            inserted_chunks.append({
                "id": chunk_id, "header": chunk["header"], "content": chunk["content"]
            })

        result = self._format_protocol(row)
        result["chunks"] = inserted_chunks
        return result

    async def search(self, query: str, site_id: str = None,
                     trial_id: str = None, limit: int = 10) -> list[dict]:
        """Search protocol chunks via vector similarity or keyword fallback."""
        if self.embeddings:
            try:
                return await self._vector_search(query, site_id, trial_id, limit)
            except Exception:
                pass
        return await self._keyword_search(query, site_id, trial_id, limit)

    async def _vector_search(self, query: str, site_id: str = None,
                             trial_id: str = None, limit: int = 10) -> list[dict]:
        query_vec = await self.embeddings.embed(query)
        pgvec = self.embeddings.to_pgvector(query_vec)

        conditions = ["pc.embedding IS NOT NULL"]
        args = [pgvec]
        i = 2

        if site_id:
            conditions.append(f"(p.site_id = ${i} OR p.site_id IS NULL)")
            args.append(site_id)
            i += 1
        if trial_id:
            conditions.append(f"p.trial_id = ${i}")
            args.append(trial_id)
            i += 1

        args.append(limit)
        limit_idx = i

        where = " AND ".join(conditions)

        rows = await self._fetch(
            f"""SELECT pc.id, pc.header, pc.content, p.name AS protocol_name,
                       p.trial_id, p.version,
                       (1 - (pc.embedding <=> $1::vector)) AS similarity
                FROM protocol_chunks pc
                JOIN protocols p ON pc.protocol_id = p.id
                WHERE {where}
                ORDER BY similarity DESC
                LIMIT ${limit_idx}""",
            *args,
        )
        return [dict(r) for r in rows]

    async def _keyword_search(self, query: str, site_id: str = None,
                              trial_id: str = None, limit: int = 10) -> list[dict]:
        conditions = []
        args = []
        i = 1

        if site_id:
            conditions.append(f"(p.site_id = ${i} OR p.site_id IS NULL)")
            args.append(site_id)
            i += 1
        if trial_id:
            conditions.append(f"p.trial_id = ${i}")
            args.append(trial_id)
            i += 1

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        rows = await self._fetch(
            f"""SELECT pc.id, pc.header, pc.content, p.name AS protocol_name,
                       p.trial_id, p.version
                FROM protocol_chunks pc
                JOIN protocols p ON pc.protocol_id = p.id
                {where}""",
            *args,
        )

        # Score in Python
        words = query.lower().split()
        scored = []
        for r in rows:
            text = f"{r['header']} {r['content']}".lower()
            matches = sum(1 for w in words if w in text)
            if matches > 0:
                r["similarity"] = matches / len(words)
                scored.append(dict(r))

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:limit]

    async def list_all(self) -> list[dict]:
        """Load all protocols with chunks for facade preload."""
        return await self.list_protocols()

    def _chunk(self, content: str) -> list[dict]:
        """Split protocol text into searchable chunks by section headers."""
        lines = content.strip().split("\n")
        chunks = []
        current_header = "Overview"
        current_lines = []

        for line in lines:
            stripped = line.strip()
            if stripped and stripped[0].isdigit() and ". " in stripped[:5]:
                if current_lines:
                    chunks.append({
                        "header": current_header,
                        "content": "\n".join(current_lines).strip(),
                    })
                current_header = stripped
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            chunks.append({
                "header": current_header,
                "content": "\n".join(current_lines).strip(),
            })

        return chunks

    def _format_protocol(self, row: dict) -> dict:
        p = dict(row)
        if p.get("upload_date") is not None:
            p["upload_date"] = str(p["upload_date"])
        p.pop("created_at", None)
        return p
