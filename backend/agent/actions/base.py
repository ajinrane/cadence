"""
Action System - Pluggable action interface.

v1: Actions execute against database (Supabase queries)
v2: Actions execute via desktop control (screen automation)
v3: Actions execute via CTMS APIs (Medidata, Veeva)

The agent planner produces action requests. The executor routes them
through whatever action provider is configured. This is the key
abstraction that makes the desktop copilot transition seamless.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional


class ActionType(str, Enum):
    QUERY_PATIENTS = "query_patients"
    GET_RISK_SCORES = "get_risk_scores"
    SCHEDULE_VISIT = "schedule_visit"
    LOG_INTERVENTION = "log_intervention"
    SEND_REMINDER = "send_reminder"
    SEARCH_KNOWLEDGE = "search_knowledge"
    GET_TRIAL_INFO = "get_trial_info"
    GET_PATIENT_TIMELINE = "get_patient_timeline"
    # New in v2
    LIST_TASKS = "list_tasks"
    GET_TODAY_TASKS = "get_today_tasks"
    COMPLETE_TASK = "complete_task"
    SEARCH_PROTOCOLS = "search_protocols"
    GET_PATIENT_SUMMARY = "get_patient_summary"
    GET_MONITORING_PREP = "get_monitoring_prep"
    GET_INTERVENTION_STATS = "get_intervention_stats"
    GET_OPEN_QUERIES = "get_open_queries"
    GET_SITE_ANALYTICS = "get_site_analytics"
    GENERATE_HANDOFF = "generate_handoff"


@dataclass
class ActionRequest:
    """What the agent wants to do."""
    action_type: ActionType
    parameters: dict
    description: str  # Human-readable description for the CRC
    requires_approval: bool = False  # If True, CRC must approve before execution


@dataclass
class ActionResult:
    """What happened when the action was executed."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    description: str = ""  # Human-readable result summary


class ActionProvider(ABC):
    """
    Base class for action execution backends.

    Implement this interface for each execution environment:
    - DatabaseActionProvider: v1, queries Supabase
    - DesktopActionProvider: v2, controls screen via Anthropic computer use
    - CTMSActionProvider: v3, calls Medidata/Veeva APIs
    """

    @abstractmethod
    async def execute(self, request: ActionRequest) -> ActionResult:
        ...

    @abstractmethod
    async def can_execute(self, action_type: ActionType) -> bool:
        """Check if this provider can handle a given action type."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Verify the provider is connected and operational."""
        ...
