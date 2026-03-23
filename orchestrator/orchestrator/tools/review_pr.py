import structlog
from orchestrator.gateway_client import GatewayClient

log = structlog.get_logger(__name__)


async def review_pr(gateway: GatewayClient, inputs: dict) -> str:
    pr = await gateway.review_pr(
        pr_number=inputs["pr_number"],
        manifesto_score=inputs["manifesto_score"],
        simplicity_score=inputs["simplicity_score"],
        security_score=inputs["security_score"],
        quality_score=inputs["quality_score"],
        scope_score=inputs["scope_score"],
        summary=inputs["summary"],
        approved=inputs["approved"],
    )
    total = sum([
        inputs["manifesto_score"], inputs["simplicity_score"],
        inputs["security_score"], inputs["quality_score"], inputs["scope_score"],
    ])
    status = "APPROVED" if inputs["approved"] else "CHANGES REQUESTED"
    log.info("pr_reviewed", pr_number=inputs["pr_number"], score=total, approved=inputs["approved"])
    return f"PR #{inputs['pr_number']} reviewed: {status} (score: {total}/100)"
