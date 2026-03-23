"""
Entry point for the orchestrator process.
Uses APScheduler to run the orchestrator cycle every CYCLE_INTERVAL_MINUTES.
"""
import asyncio
import logging

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from orchestrator.cycle import OrchestratorCycle
from orchestrator.gateway_client import GatewayClient
from orchestrator.settings import settings

log = structlog.get_logger(__name__)

_cycle_number = 0


async def run_cycle(gateway: GatewayClient) -> None:
    global _cycle_number
    _cycle_number += 1
    cycle = OrchestratorCycle(gateway)
    await cycle.run(_cycle_number)


async def main() -> None:
    logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
    structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.INFO))

    log.info(
        "orchestrator_starting",
        gateway_url=settings.gateway_url,
        cycle_interval_minutes=settings.cycle_interval_minutes,
    )

    gateway = GatewayClient()

    # Wait for gateway to be reachable before starting scheduler
    for attempt in range(30):
        try:
            health = await gateway.get_health()
            log.info("gateway_connected", status=health.get("status"))
            break
        except Exception as e:
            log.warning("gateway_not_ready", attempt=attempt + 1, error=str(e))
            await asyncio.sleep(5)
    else:
        log.error("gateway_unreachable_after_30_attempts")
        return

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_cycle,
        "interval",
        minutes=settings.cycle_interval_minutes,
        args=[gateway],
        id="orchestrator_cycle",
        max_instances=1,  # Never run two cycles simultaneously
        misfire_grace_time=60,
    )
    scheduler.start()

    log.info(
        "scheduler_started",
        interval_minutes=settings.cycle_interval_minutes,
    )

    # Run the first cycle immediately on startup
    log.info("running_initial_cycle")
    await run_cycle(gateway)

    try:
        # Keep the process alive
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, asyncio.CancelledError):
        log.info("orchestrator_stopping")
    finally:
        scheduler.shutdown()
        await gateway.close()


def run() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    run()
