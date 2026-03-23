"""
OrchestratorCycle: the core cycle loop.

Each cycle is stateless:
  1. Check pause flag
  2. Build 6-section context
  3. Call Claude Haiku with tool schemas
  4. While stop_reason == "tool_use": dispatch tools, append results, continue
  5. Record the run via gateway API

The orchestrator communicates with the gateway exclusively via HTTP.
"""
import json
import uuid
from datetime import datetime, timezone

import anthropic
import structlog

from orchestrator.context_builder import build_context
from orchestrator.gateway_client import GatewayClient
from orchestrator.settings import settings
from orchestrator.tool_dispatcher import dispatch
from orchestrator.tool_schemas import ORCHESTRATOR_TOOLS

log = structlog.get_logger(__name__)

SYSTEM_PROMPT = """You are the Orchestrator of the Digital Homestead project.

Your mandate: turn the Manifesto into working software by creating tasks,
reviewing code, and merging changes. You NEVER write code. You delegate, review, decide.

Per cycle: review the project state provided in the user message, then take the most
impactful available actions to advance the roadmap.

Limits:
- Maximum 5 new tasks per cycle.
- Task board maximum is 20 open tasks. Do not create tasks if the board is near capacity.
- Budget hard-stop: if total API spend is approaching $5 USD in 24 hours, call pause.

PR review rubric (apply in priority order — a PR must pass ALL 5 to be merged):
  1. Manifesto Alignment (0-20): Does this serve digital self-reliance? Aligned with the manifesto?
  2. Simplicity (0-20): Runs on Raspberry Pi 4? No unnecessary dependencies?
  3. Security (0-20): No open ports with default passwords, no telemetry, no phoning home?
  4. Code Quality (0-20): Readable, tested, documented?
  5. Task Scope (0-20): Matches the claimed task? No scope creep?

Minimum passing score per dimension: 12/20.

Always end each cycle by calling broadcast with a brief summary of what you did.
"""


class OrchestratorCycle:
    def __init__(self, gateway: GatewayClient) -> None:
        self._gateway = gateway
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def run(self, cycle_number: int) -> dict:
        run_id = str(uuid.uuid4())
        started_at = datetime.now(timezone.utc).isoformat()
        actions: list[dict] = []
        total_input_tokens = 0
        total_output_tokens = 0
        error: str | None = None

        log.info("cycle_start", cycle=cycle_number, run_id=run_id)

        try:
            # 1. Check pause flag
            ctx_snapshot = await self._gateway.get_context()
            if ctx_snapshot.get("paused"):
                log.warning("cycle_skipped_paused", reason=ctx_snapshot.get("pause_reason"))
                return {"id": run_id, "status": "paused", "cycle_number": cycle_number,
                        "started_at": started_at, "completed_at": _now()}

            # 2. Build context
            context_blocks = await build_context(self._gateway, cycle_number)

            # 3. Run the tool-use loop (adapted from erp_llm agent_loop pattern)
            messages = [{"role": "user", "content": context_blocks}]
            paused_by_tool = False

            while True:
                response = await self._client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=ORCHESTRATOR_TOOLS,
                    messages=messages,
                )
                total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

                if response.stop_reason == "end_turn":
                    log.info("cycle_end_turn", cycle=cycle_number)
                    break

                if response.stop_reason != "tool_use":
                    log.warning("unexpected_stop_reason", reason=response.stop_reason)
                    break

                # Collect tool_use blocks
                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue

                    log.info("tool_call", tool=block.name, inputs=str(block.input)[:120])
                    result = await dispatch(self._gateway, block.name, block.input)
                    actions.append({"tool": block.name, "result": result[:200]})
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

                    # If pause was called, stop the loop after recording the result
                    if block.name == "pause":
                        paused_by_tool = True

                # Append assistant turn + tool results to messages
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

                if paused_by_tool:
                    break

        except Exception as e:
            log.error("cycle_error", cycle=cycle_number, error=str(e))
            error = str(e)

        completed_at = _now()
        status = "completed" if not error else "failed"

        # 4. Record the run
        run_record = {
            "id": run_id,
            "started_at": started_at,
            "completed_at": completed_at,
            "status": status,
            "cycle_number": cycle_number,
            "context_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "actions_taken": json.dumps(actions),
            "error": error,
        }
        try:
            await self._gateway.record_run(run_record)
        except Exception as e:
            log.error("failed_to_record_run", error=str(e))

        log.info(
            "cycle_complete",
            cycle=cycle_number,
            status=status,
            actions=len(actions),
            input_tokens=total_input_tokens,
            output_tokens=total_output_tokens,
        )
        return run_record


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
