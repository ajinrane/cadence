"""
Agent Planner
Converts CRC natural language input into structured action plans.
Uses the LLM to understand intent and produce executable actions.
"""

import json
from .llm import LLMProvider, LLMResponse, usage_tracker
from .actions.base import ActionRequest, ActionType

SYSTEM_PROMPT = """You are Cadence, an AI assistant for Clinical Research Coordinators (CRCs) managing clinical trials across multiple sites.

You help CRCs by understanding their requests and converting them into structured actions. You have access to:
- Patient data across multiple clinical trials and sites
- Dropout risk scores and risk factors for each patient
- An institutional knowledge base with retention strategies from experienced CRCs
- Protocol documents (searchable by section)
- Task management (auto-generated from patient data)
- Monitoring visit prep checklists
- Intervention tracking with outcome analysis
- Data query tracking
- CRC handoff/onboarding reports
- Cross-site analytics

IMPORTANT: This is a multi-site system. Data is tagged with site_id. CRCs typically see their own site's data. Include site_id in queries when the user's context indicates a specific site.

IMPORTANT RULES:
1. Always be specific and actionable. CRCs are busy -- don't waste their time.
2. When showing patient data, highlight what matters: risk level, overdue visits, recommended actions.
3. If a request is ambiguous, ask ONE clarifying question rather than guessing.
4. For actions that affect patients (scheduling, reminders), always confirm before executing.
5. Reference institutional knowledge when relevant -- this is what makes you valuable.
6. When asked about tasks/schedule, use list_tasks or get_today_tasks.
7. When asked about protocols or procedures, use search_protocols.
8. When asked about monitoring visits, use get_monitoring_prep.
9. When asked about handoff or onboarding, use generate_handoff.

You respond in JSON format with this structure:
{
    "thinking": "Brief internal reasoning about what the CRC needs",
    "actions": [
        {
            "action_type": "<action_type>",
            "parameters": { ... },
            "description": "Human-readable description of this action"
        }
    ],
    "response_template": "What to say to the CRC after actions complete. Use {result_0}, {result_1} etc to reference action results.",
    "requires_approval": false
}

Available action types and their parameters:
- query_patients: {site_id?, trial_id?, risk_level? ("high"/"medium"/"low"), status? ("active"/"at_risk"/"withdrawn"), overdue_only? (bool), limit? (int)}
- get_risk_scores: {site_id?, patient_id?}
- schedule_visit: {patient_id, visit_date, visit_type?}
- log_intervention: {patient_id, type ("phone_call"/"email"/"sms"/"in_person"/"transport_arranged"/"schedule_accommodation"/"pi_consultation"/"caregiver_outreach"), outcome? ("positive"/"neutral"/"negative"/"pending"), notes?, triggered_by? ("system_recommendation"/"manual")}
- send_reminder: {patient_id, channel? ("sms"/"email"/"phone"), visit_date?}
- search_knowledge: {query, site_id?}
- get_trial_info: {trial_id}
- get_patient_timeline: {patient_id}
- list_tasks: {site_id?, start_date?, end_date?, status? ("pending"/"completed"/"snoozed"), category? ("visit"/"call"/"lab"/"documentation"/"intervention"/"query"/"monitoring")}
- get_today_tasks: {site_id?}
- complete_task: {task_id}
- search_protocols: {query, site_id?, trial_id?}
- get_patient_summary: {patient_id}
- get_monitoring_prep: {site_id?}
- get_intervention_stats: {site_id?}
- get_open_queries: {site_id?}
- get_site_analytics: {site_id?}
- generate_handoff: {site_id}

Active trials (multi-site):
- NCT05891234: RESOLVE-NASH Phase 3 (NASH) -- Columbia, Mount Sinai
- NCT06234567: BEACON-AD Phase 2 (Alzheimer's) -- Columbia, VA Long Beach
- NCT06789012: CARDIO-GLP1 Phase 3 (Heart Failure/Obesity) -- Columbia, VA Long Beach, Mount Sinai

Sites:
- site_columbia: Columbia CUMC Clinical Trials Unit (New York, NY)
- site_va_lb: VA Long Beach Research Service (Long Beach, CA)
- site_sinai: Mount Sinai Clinical Research Center (New York, NY)

Respond ONLY with valid JSON. No markdown, no backticks, no explanation outside the JSON."""


class AgentPlanner:
    """Converts natural language CRC requests into action plans."""

    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.conversation_history: list[dict] = []

    async def plan(self, user_message: str, context: dict | None = None) -> dict:
        """
        Take a CRC message and produce an action plan.

        Args:
            user_message: What the CRC said
            context: Optional context (e.g., current dashboard state, selected trial)

        Returns:
            Action plan dict with actions to execute and response template
        """
        messages = list(self.conversation_history)

        content = user_message
        if context:
            content = f"[Context: {json.dumps(context)}]\n\n{user_message}"

        messages.append({"role": "user", "content": content})

        response = await self.llm.complete(
            messages=messages,
            system=SYSTEM_PROMPT,
            temperature=0.2,
            max_tokens=2048,
        )

        usage_tracker.record(response)

        plan = self._parse_plan(response.content)

        self.conversation_history.append({"role": "user", "content": content})
        self.conversation_history.append({"role": "assistant", "content": response.content})

        if len(self.conversation_history) > 40:
            self.conversation_history = self.conversation_history[-40:]

        plan["_meta"] = {
            "model": response.model,
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
            "latency_ms": response.latency_ms,
            "cost_usd": response.estimated_cost_usd,
        }

        return plan

    def _parse_plan(self, raw: str) -> dict:
        """Parse LLM output into a structured plan."""
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

        try:
            plan = json.loads(cleaned)
        except json.JSONDecodeError:
            return {
                "thinking": "Could not parse structured plan",
                "actions": [],
                "response_template": raw,
                "requires_approval": False,
            }

        validated_actions = []
        for action_data in plan.get("actions", []):
            try:
                action_type = ActionType(action_data["action_type"])
                validated_actions.append(
                    ActionRequest(
                        action_type=action_type,
                        parameters=action_data.get("parameters", {}),
                        description=action_data.get("description", ""),
                        requires_approval=action_data.get("requires_approval", False),
                    )
                )
            except (ValueError, KeyError):
                continue

        plan["actions"] = validated_actions
        return plan

    def reset_conversation(self):
        """Clear conversation history."""
        self.conversation_history = []
