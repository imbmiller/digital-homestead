import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def flag_agent(gateway: GatewayClient, inputs: dict) -> str:
    await gateway.flag_agent(inputs["agent_id"], inputs["reason"])
    log.info("agent_flagged", agent_id=inputs["agent_id"], reason=inputs["reason"][:80])
    return f"Agent {inputs['agent_id']} flagged: {inputs['reason'][:80]}"
