import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def broadcast(gateway: GatewayClient, inputs: dict) -> str:
    message = inputs["message"][:500]
    await gateway.broadcast(message)
    log.info("broadcast_sent", message=message[:80])
    return f"Broadcast sent: {message[:80]}"
