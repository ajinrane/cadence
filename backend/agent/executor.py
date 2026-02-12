"""
Agent Executor
Takes a plan from the planner, executes actions, and formats the response.
This is the orchestration layer between the LLM and the action providers.
"""

import json
from .planner import AgentPlanner
from .actions.base import ActionProvider, ActionRequest, ActionResult
from .llm import LLMProvider, usage_tracker


class AgentExecutor:
    """
    The main agent loop:
    1. CRC sends message
    2. Planner converts to action plan
    3. Executor runs actions via the action provider
    4. Results are formatted into a CRC-friendly response
    """

    def __init__(self, llm: LLMProvider, action_provider: ActionProvider):
        self.planner = AgentPlanner(llm)
        self.action_provider = action_provider
        self.llm = llm
        self.resolved_patients: dict = {}  # name_lower → patient_id

    async def handle_message(self, message: str, context: dict | None = None) -> dict:
        """
        Process a CRC message end-to-end.
        
        Returns:
            {
                "response": str,          # The message to show the CRC
                "actions_taken": list,     # What was executed
                "data": list,             # Raw data from actions
                "requires_approval": bool, # If CRC needs to confirm
                "pending_actions": list,   # Actions waiting for approval
                "meta": dict,             # Cost/performance tracking
            }
        """
        # Inject resolved patients into context so planner knows them
        context = context or {}
        if self.resolved_patients:
            context["resolved_patients"] = self.resolved_patients

        # Step 1: Plan
        plan = await self.planner.plan(message, context)

        # Step 2: Separate auto-execute from approval-needed
        auto_actions = [a for a in plan.get("actions", []) if not a.requires_approval]
        approval_actions = [a for a in plan.get("actions", []) if a.requires_approval]

        # Step 3: Execute auto actions
        results = []
        for action in auto_actions:
            result = await self.action_provider.execute(action)
            results.append({
                "action": action.description,
                "action_type": action.action_type.value if hasattr(action.action_type, 'value') else str(action.action_type),
                "result": result,
            })

            # Remember resolved patients for future turns
            if action.action_type.value == "resolve_patient" and result.success:
                data = result.data
                if isinstance(data, dict) and data.get("resolved") and data.get("patient"):
                    name = data["patient"].get("name", "").lower()
                    pid = data.get("patient_id", "")
                    if name and pid:
                        self.resolved_patients[name] = pid

        # Step 4: Format response using results
        response_text = await self._format_response(
            plan.get("response_template", ""),
            results,
            message,
        )

        return {
            "response": response_text,
            "actions_taken": [
                {
                    "type": r["action_type"],
                    "description": r["action"],
                    "success": r["result"].success,
                    "summary": r["result"].description,
                }
                for r in results
            ],
            "data": [
                r["result"].data for r in results if r["result"].success
            ],
            "requires_approval": len(approval_actions) > 0,
            "pending_actions": [
                {
                    "type": a.action_type.value if hasattr(a.action_type, 'value') else str(a.action_type),
                    "description": a.description,
                    "parameters": a.parameters,
                }
                for a in approval_actions
            ],
            "meta": plan.get("_meta", {}),
        }

    async def approve_pending(self, action_index: int = 0) -> dict:
        """Execute a previously pending action after CRC approval."""
        # In production, pending actions would be stored in DB
        # For now, this is a placeholder for the approval flow
        return {
            "response": "Action approved and executed.",
            "success": True,
        }

    async def _format_response(
        self, template: str, results: list[dict], original_message: str
    ) -> str:
        """
        Format the response for the CRC. 
        If the template has placeholders, fill them.
        If results contain data, format it nicely.
        """
        # Simple placeholder replacement
        response = template
        for i, result in enumerate(results):
            placeholder = f"{{result_{i}}}"
            if placeholder in response:
                response = response.replace(
                    placeholder, self._format_result_data(result)
                )

        # If no template or it's empty, generate a response from the data
        if not response.strip() or response == template:
            response = await self._generate_response(original_message, results)

        return response

    def _format_result_data(self, result: dict) -> str:
        """Format a single action result into readable text."""
        data = result["result"].data
        if data is None:
            return result["result"].description

        if isinstance(data, list) and len(data) > 0:
            if "patient_id" in data[0]:
                return self._format_patient_list(data)
            elif "content" in data[0]:
                return self._format_knowledge(data)

        return result["result"].description

    def _format_patient_list(self, patients: list[dict]) -> str:
        """Format patient data for CRC display."""
        lines = []
        for p in patients[:10]:  # Cap at 10
            risk = p.get("dropout_risk_score", p.get("risk_level", "unknown"))
            if isinstance(risk, float):
                risk_pct = f"{risk:.0%}"
                level = "🔴" if risk >= 0.7 else "🟡" if risk >= 0.4 else "🟢"
            else:
                risk_pct = risk
                level = "🔴" if risk == "high" else "🟡" if risk == "medium" else "🟢"

            line = f"{level} **{p.get('name', p['patient_id'])}** ({p['patient_id']}) — {risk_pct} risk"

            if factors := p.get("risk_factors", []):
                line += f"\n   Top factor: {factors[0]}"

            if actions := p.get("recommended_actions", []):
                line += f"\n   → {actions[0]}"

            lines.append(line)

        total = len(patients)
        if total > 10:
            lines.append(f"\n... and {total - 10} more patients")

        return "\n\n".join(lines)

    def _format_knowledge(self, entries: list[dict]) -> str:
        """Format knowledge base entries."""
        lines = []
        for entry in entries:
            lines.append(f"📋 **{entry.get('category', 'tip')}**: {entry['content']}")
            if source := entry.get("source"):
                lines.append(f"   _Source: {source}_")
        return "\n\n".join(lines)

    async def _generate_response(self, message: str, results: list[dict]) -> str:
        """Use LLM to generate a natural response from action results."""
        results_summary = []
        for r in results:
            data = r["result"].data
            # Truncate large data for the LLM
            if isinstance(data, list) and len(data) > 5:
                summary_data = data[:5]
                summary_data.append({"note": f"... and {len(data) - 5} more"})
            else:
                summary_data = data

            results_summary.append({
                "action": r["action"],
                "success": r["result"].success,
                "data": _safe_serialize(summary_data),
                "summary": r["result"].description,
            })

        prompt = f"""The CRC asked: "{message}"

Here are the results from the actions I took:
{json.dumps(results_summary, indent=2, default=str)}

Write a concise, helpful response for the CRC. Be specific with numbers and patient details. 
If showing patient data, format clearly with risk indicators.
Keep it under 300 words. Be direct — CRCs are busy."""

        response = await self.llm.complete(
            messages=[{"role": "user", "content": prompt}],
            system="You are Cadence, a helpful AI assistant for Clinical Research Coordinators. Be concise and actionable.",
            temperature=0.3,
            max_tokens=1024,
        )
        usage_tracker.record(response)
        return response.content

    def reset(self):
        """Reset conversation state."""
        self.planner.reset_conversation()
        self.resolved_patients.clear()


def _safe_serialize(obj):
    """Make sure data is JSON serializable."""
    if obj is None:
        return None
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)
