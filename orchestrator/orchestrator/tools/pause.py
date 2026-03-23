import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def pause(gateway: GatewayClient, inputs: dict) -> str:
    reason = inputs["reason"]
    await gateway.broadcast(f"ORCHESTRATOR PAUSING: {reason}")
    await gateway.pause(reason)
    log.warning("orchestrator_paused", reason=reason)
    return f"Orchestrator paused: {reason}"
