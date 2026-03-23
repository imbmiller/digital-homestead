import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def update_roadmap(gateway: GatewayClient, inputs: dict) -> str:
    # The roadmap update is stored in the gateway and broadcast as an event.
    # A separate job (or manual step) can commit ROADMAP.md changes to GitHub.
    await gateway.broadcast(
        f"ROADMAP UPDATE: epic={inputs['epic']} status={inputs['status']}"
        + (f" — {inputs['notes']}" if inputs.get("notes") else "")
    )
    log.info("roadmap_updated", epic=inputs["epic"], status=inputs["status"])
    return f"Roadmap updated: {inputs['epic']} → {inputs['status']}"
