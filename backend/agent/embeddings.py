"""
OpenAI embedding provider for RAG search.
Uses text-embedding-3-small (1536 dimensions) with in-memory caching.
"""

import hashlib
from typing import Optional

from openai import AsyncOpenAI

_provider: Optional["EmbeddingProvider"] = None

MODEL = "text-embedding-3-small"
DIMENSIONS = 1536
BATCH_SIZE = 100


class EmbeddingProvider:
    def __init__(self):
        self.client = AsyncOpenAI()
        self._cache: dict[str, list[float]] = {}

    @staticmethod
    def _cache_key(text: str) -> str:
        return hashlib.md5(text.encode()).hexdigest()

    async def embed(self, text: str) -> list[float]:
        """Embed a single text string. Returns 1536-dim vector."""
        key = self._cache_key(text)
        if key in self._cache:
            return self._cache[key]

        response = await self.client.embeddings.create(
            model=MODEL,
            input=text,
            dimensions=DIMENSIONS,
        )
        embedding = response.data[0].embedding
        self._cache[key] = embedding
        return embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed multiple texts. Uses cache and batches API calls (max 100/request)."""
        results: list[Optional[list[float]]] = [None] * len(texts)
        to_embed: list[tuple[int, str]] = []

        # Check cache first
        for i, text in enumerate(texts):
            key = self._cache_key(text)
            if key in self._cache:
                results[i] = self._cache[key]
            else:
                to_embed.append((i, text))

        # Batch embed uncached texts
        for batch_start in range(0, len(to_embed), BATCH_SIZE):
            batch = to_embed[batch_start : batch_start + BATCH_SIZE]
            batch_texts = [text for _, text in batch]

            response = await self.client.embeddings.create(
                model=MODEL,
                input=batch_texts,
                dimensions=DIMENSIONS,
            )

            for j, embedding_data in enumerate(response.data):
                idx = batch[j][0]
                text = batch[j][1]
                embedding = embedding_data.embedding
                self._cache[self._cache_key(text)] = embedding
                results[idx] = embedding

        return results

    @staticmethod
    def to_pgvector(embedding: list[float]) -> str:
        """Convert embedding list to pgvector string format '[0.1,0.2,...]'."""
        return "[" + ",".join(str(x) for x in embedding) + "]"


def get_embedding_provider() -> EmbeddingProvider:
    """Get or create singleton embedding provider."""
    global _provider
    if _provider is None:
        _provider = EmbeddingProvider()
    return _provider
