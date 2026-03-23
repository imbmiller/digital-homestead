import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def create_task(gateway: GatewayClient, inputs: dict) -> str:
    task = await gateway.create_task(
        title=inputs["title"],
        description=inputs["description"],
        priority=inputs["priority"],
        epic=inputs.get("epic"),
        parent_task_id=inputs.get("parent_task_id"),
    )
    log.info("task_created", task_id=task["id"], title=inputs["title"])
    return f"Task created: {task['id']} — \"{task['title']}\""
