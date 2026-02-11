"""
LLM Provider Abstraction Layer
Swap between Claude and OpenAI with an env variable.
Tracks token usage and estimated cost per request.
"""

import os
import time
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

# ── Cost per 1M tokens (update as pricing changes) ──────────────────────
PRICING = {
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


@dataclass
class LLMResponse:
    content: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: float
    estimated_cost_usd: float
    raw_response: Optional[dict] = None


@dataclass
class UsageTracker:
    """Tracks cumulative usage across requests."""
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    total_requests: int = 0
    requests: list = field(default_factory=list)

    def record(self, response: LLMResponse):
        self.total_input_tokens += response.input_tokens
        self.total_output_tokens += response.output_tokens
        self.total_cost_usd += response.estimated_cost_usd
        self.total_requests += 1
        self.requests.append({
            "model": response.model,
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
            "cost_usd": response.estimated_cost_usd,
            "latency_ms": response.latency_ms,
            "timestamp": time.time(),
        })

    def summary(self) -> dict:
        return {
            "total_requests": self.total_requests,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cost_usd": round(self.total_cost_usd, 6),
        }


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = PRICING.get(model, {"input": 0, "output": 0})
    cost = (input_tokens / 1_000_000) * pricing["input"] + \
           (output_tokens / 1_000_000) * pricing["output"]
    return round(cost, 6)


class LLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        ...


class ClaudeProvider(LLMProvider):
    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        import anthropic
        self.client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = model

    async def complete(self, messages, system="", tools=None, temperature=0.3, max_tokens=4096):
        start = time.time()
        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        response = await self.client.messages.create(**kwargs)
        latency = (time.time() - start) * 1000

        content = ""
        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                content += json.dumps({"tool_use": {"name": block.name, "input": block.input}})

        return LLMResponse(
            content=content,
            model=self.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=round(latency, 1),
            estimated_cost_usd=_estimate_cost(
                self.model, response.usage.input_tokens, response.usage.output_tokens
            ),
            raw_response=response.model_dump() if hasattr(response, "model_dump") else None,
        )


class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o"):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.model = model

    async def complete(self, messages, system="", tools=None, temperature=0.3, max_tokens=4096):
        start = time.time()

        # OpenAI uses system message in the messages array
        full_messages = []
        if system:
            full_messages.append({"role": "system", "content": system})
        full_messages.extend(messages)

        kwargs = {
            "model": self.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "messages": full_messages,
        }
        if tools:
            # Convert Anthropic tool format to OpenAI format
            kwargs["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "parameters": t.get("input_schema", {}),
                    },
                }
                for t in tools
            ]

        response = await self.client.chat.completions.create(**kwargs)
        latency = (time.time() - start) * 1000

        choice = response.choices[0]
        content = choice.message.content or ""

        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                content += json.dumps({
                    "tool_use": {
                        "name": tc.function.name,
                        "input": json.loads(tc.function.arguments),
                    }
                })

        return LLMResponse(
            content=content,
            model=self.model,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
            latency_ms=round(latency, 1),
            estimated_cost_usd=_estimate_cost(
                self.model, response.usage.prompt_tokens, response.usage.completion_tokens
            ),
            raw_response=response.model_dump() if hasattr(response, "model_dump") else None,
        )


# ── Factory ──────────────────────────────────────────────────────────────

# Global tracker (per process; for production use Redis or DB)
usage_tracker = UsageTracker()


def get_llm(provider: str | None = None, model: str | None = None) -> LLMProvider:
    """
    Get an LLM provider. Reads from env if not specified.
    
    Usage:
        llm = get_llm()  # reads LLM_PROVIDER env var
        llm = get_llm("claude", "claude-haiku-4-5-20251001")  # explicit
        llm = get_llm("openai", "gpt-4o-mini")  # cheaper model
    """
    provider = provider or os.environ.get("LLM_PROVIDER", "claude")

    if provider == "claude":
        return ClaudeProvider(model=model or os.environ.get("LLM_MODEL", "claude-sonnet-4-20250514"))
    elif provider == "openai":
        return OpenAIProvider(model=model or os.environ.get("LLM_MODEL", "gpt-4o"))
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Use 'claude' or 'openai'.")
