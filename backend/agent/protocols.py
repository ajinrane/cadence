"""
Protocol Manager
Accepts protocol text, chunks it, stores it, and provides search.
Production: vector DB. Dev: in-memory keyword search.
"""

import uuid
from datetime import datetime


def _uid() -> str:
    return uuid.uuid4().hex[:8]


class ProtocolManager:
    """Manages protocol documents — upload, chunk, search."""

    def __init__(self, db):
        self.db = db

    def upload(self, content: str, name: str, trial_id: str,
               site_id: str | None = None, version: str = "1.0",
               uploaded_by: str = "CRC") -> dict:
        """Upload protocol text, auto-chunk, and store."""
        chunks = self._chunk(content)
        protocol = {
            "id": f"proto_{_uid()}",
            "trial_id": trial_id,
            "site_id": site_id,
            "name": name,
            "version": version,
            "upload_date": datetime.now().strftime("%Y-%m-%d"),
            "uploaded_by": uploaded_by,
            "chunks": chunks,
        }
        self.db.protocols.append(protocol)
        return protocol

    def list_protocols(self, site_id: str | None = None,
                       trial_id: str | None = None) -> list[dict]:
        protos = self.db.protocols
        if site_id:
            protos = [p for p in protos if p["site_id"] == site_id or p["site_id"] is None]
        if trial_id:
            protos = [p for p in protos if p["trial_id"] == trial_id]
        return protos

    def get_protocol(self, protocol_id: str) -> dict | None:
        return next((p for p in self.db.protocols if p["id"] == protocol_id), None)

    def search(self, query: str, site_id: str | None = None,
               trial_id: str | None = None) -> list[dict]:
        """Keyword search across all protocol chunks."""
        words = query.lower().split()
        results = []

        protos = self.list_protocols(site_id=site_id, trial_id=trial_id)

        for proto in protos:
            for chunk in proto["chunks"]:
                text = chunk["content"].lower()
                score = sum(1 for w in words if w in text)
                if score > 0:
                    results.append({
                        "protocol_id": proto["id"],
                        "protocol_name": proto["name"],
                        "trial_id": proto["trial_id"],
                        "site_id": proto["site_id"],
                        "chunk_id": chunk["id"],
                        "header": chunk["header"],
                        "content": chunk["content"],
                        "relevance_score": score,
                    })

        results.sort(key=lambda r: r["relevance_score"], reverse=True)
        return results[:10]

    def _chunk(self, content: str) -> list[dict]:
        """Split by section headers or ~500-word blocks."""
        lines = content.strip().split("\n")
        chunks = []
        current_header = "Overview"
        current_lines = []

        for line in lines:
            stripped = line.strip()
            if stripped and stripped[0].isdigit() and ". " in stripped[:5]:
                if current_lines:
                    chunks.append({
                        "id": f"chunk_{_uid()}",
                        "header": current_header,
                        "content": "\n".join(current_lines).strip(),
                    })
                current_header = stripped
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            chunks.append({
                "id": f"chunk_{_uid()}",
                "header": current_header,
                "content": "\n".join(current_lines).strip(),
            })

        return chunks
