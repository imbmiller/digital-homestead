"""
Maps tool names to their async implementation functions.
Each tool receives (gateway_client, input_dict) and returns a result string.
"""
from orchestrator.gateway_client import GatewayClient
from orchestrator.tools import (
    broadcast, create_task, flag_agent, merge_pr, pause, review_pr, update_roadmap,
)

TOOL_MAP = {
    "create_task": create_task.create_task,
    "review_pr": review_pr.review_pr,
    "merge_pr": merge_pr.merge_pr,
    "update_roadmap": update_roadmap.update_roadmap,
    "broadcast": broadcast.broadcast,
    "flag_agent": flag_agent.flag_agent,
    "pause": pause.pause,
}


async def dispatch(gateway: GatewayClient, tool_name: str, tool_input: dict) -> str:
    handler = TOOL_MAP.get(tool_name)
    if handler is None:
        return f"ERROR: Unknown tool '{tool_name}'"
    try:
        return await handler(gateway, tool_input)
    except Exception as e:
        return f"ERROR executing {tool_name}: {e}"
