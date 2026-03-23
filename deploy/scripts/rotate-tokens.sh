#!/usr/bin/env bash
# rotate-tokens.sh — Rotate the orchestrator's bearer token.
# Run this if you suspect the token has been compromised.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$DEPLOY_DIR/.env"

set -a; source "$ENV_FILE"; set +a

echo "==> Generating new orchestrator token..."
NEW_TOKEN=$(openssl rand -hex 32)
NEW_HASH=$(echo -n "$NEW_TOKEN" | sha256sum | cut -d' ' -f1)

# Update the hash in the gateway DB
docker compose -f "$DEPLOY_DIR/docker-compose.yml" exec -T gateway python3 -c "
import asyncio, sys
sys.path.insert(0, '/app')
from gateway.database import init_db, AsyncSessionLocal
from gateway.models.agent import Agent, AgentToken
from gateway.services.auth_service import hash_token
from sqlalchemy import select

async def rotate():
    await init_db()
    async with AsyncSessionLocal() as db:
        agent_result = await db.execute(select(Agent).where(Agent.name == 'orchestrator-bot'))
        agent = agent_result.scalar_one()
        token_result = await db.execute(select(AgentToken).where(AgentToken.agent_id == agent.id, AgentToken.revoked == 0))
        token = token_result.scalar_one()
        token.revoked = 1
        from gateway.models.agent import AgentToken as AT
        import uuid
        from datetime import datetime, timezone
        new_record = AT(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            token_hash='${NEW_HASH}',
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(new_record)
        await db.commit()
        print('Token rotated.')

asyncio.run(rotate())
"

# Update .env
sed -i "s/^ORCHESTRATOR_TOKEN_HASH=.*/ORCHESTRATOR_TOKEN_HASH=${NEW_HASH}/" "$ENV_FILE"
sed -i "s/^ORCHESTRATOR_BEARER_TOKEN=.*/ORCHESTRATOR_BEARER_TOKEN=${NEW_TOKEN}/" "$ENV_FILE"

echo "Token rotated. Restart the orchestrator to pick up the new token:"
echo "  docker compose restart orchestrator"
