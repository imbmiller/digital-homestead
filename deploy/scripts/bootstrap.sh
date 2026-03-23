#!/usr/bin/env bash
# bootstrap.sh — First-run setup for the Digital Homestead gateway.
# Run this once on a fresh VPS after cloning the repo and installing Docker.
#
# Usage:
#   cd deploy/
#   cp .env.example .env
#   # Fill in GITHUB_TOKEN, GITHUB_REPO, ANTHROPIC_API_KEY
#   bash scripts/bootstrap.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$DEPLOY_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found. Copy .env.example to .env and fill in values."
    exit 1
fi

# Load env
set -a; source "$ENV_FILE"; set +a

echo "==> Step 1: Generating webhook secret..."
WEBHOOK_SECRET=$(openssl rand -hex 32)
sed -i "s/^GITHUB_WEBHOOK_SECRET=.*/GITHUB_WEBHOOK_SECRET=${WEBHOOK_SECRET}/" "$ENV_FILE"
echo "    Webhook secret set."

echo "==> Step 2: Starting gateway (first run creates DB tables)..."
cd "$DEPLOY_DIR"
docker compose up -d gateway
echo "    Waiting for gateway to be healthy..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "    Gateway is healthy."
        break
    fi
    sleep 2
done

echo "==> Step 3: Registering orchestrator agent..."
ORCH_TOKEN=$(openssl rand -hex 32)
ORCH_TOKEN_HASH=$(echo -n "$ORCH_TOKEN" | sha256sum | cut -d' ' -f1)

# Use the gateway's internal service endpoint to seed orchestrator role
# (orchestrator role cannot be registered via the public /agents/register endpoint)
REGISTER_RESP=$(docker compose exec -T gateway python3 -c "
import asyncio, sys
sys.path.insert(0, '/app')
from gateway.database import init_db, AsyncSessionLocal
from gateway.services.auth_service import register_agent, hash_token
import hashlib

async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        agent, _ = await register_agent(db, 'orchestrator-bot', 'orchestrator')
        # Replace the auto-generated token with our known one
        from gateway.models.agent import AgentToken
        from sqlalchemy import select, update
        result = await db.execute(select(AgentToken).where(AgentToken.agent_id == agent.id))
        token_record = result.scalar_one()
        token_record.token_hash = hash_token('${ORCH_TOKEN}')
        await db.commit()
        print(agent.id)

asyncio.run(seed())
" 2>/dev/null)

ORCH_AGENT_ID=$(echo "$REGISTER_RESP" | tail -1)
echo "    Orchestrator agent ID: $ORCH_AGENT_ID"

# Write token hash to .env
sed -i "s/^ORCHESTRATOR_TOKEN_HASH=.*/ORCHESTRATOR_TOKEN_HASH=${ORCH_TOKEN_HASH}/" "$ENV_FILE"

# Save plain token for orchestrator container (it needs it to call the gateway)
echo "" >> "$ENV_FILE"
echo "# Orchestrator bearer token (used by orchestrator container — keep secret)" >> "$ENV_FILE"
echo "ORCHESTRATOR_BEARER_TOKEN=${ORCH_TOKEN}" >> "$ENV_FILE"

echo "==> Step 4: Registering GitHub webhook..."
GATEWAY_URL="${GATEWAY_PUBLIC_URL:-https://gateway.yourdomain.com}"
WEBHOOK_RESP=$(curl -sf -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${GITHUB_REPO}/hooks" \
    -d "{
        \"name\": \"web\",
        \"active\": true,
        \"events\": [\"push\", \"pull_request\"],
        \"config\": {
            \"url\": \"${GATEWAY_URL}/prs/webhook\",
            \"content_type\": \"json\",
            \"secret\": \"${WEBHOOK_SECRET}\"
        }
    }" 2>&1 || true)

if echo "$WEBHOOK_RESP" | grep -q '"id"'; then
    echo "    GitHub webhook registered successfully."
else
    echo "    WARNING: Webhook registration may have failed. Check manually:"
    echo "    https://github.com/${GITHUB_REPO}/settings/hooks"
    echo "    Response: $WEBHOOK_RESP"
fi

echo "==> Step 5: Starting all services..."
docker compose up -d

echo ""
echo "========================================="
echo "  Bootstrap complete!"
echo "========================================="
echo ""
echo "  Gateway:     ${GATEWAY_URL}"
echo "  Health:      ${GATEWAY_URL}/health"
echo "  API docs:    ${GATEWAY_URL}/docs"
echo ""
echo "  Next steps:"
echo "  1. Point DNS A record for gateway.yourdomain.com to this server's IP"
echo "  2. Update Caddyfile with your actual domain and restart: docker compose restart caddy"
echo "  3. Verify HTTPS: curl https://gateway.yourdomain.com/health"
echo "  4. Verify SSE: curl -N https://gateway.yourdomain.com/events (with auth)"
echo "  5. Deploy the orchestrator: docker compose up -d orchestrator"
echo ""
echo "  IMPORTANT: The orchestrator bearer token is in .env as ORCHESTRATOR_BEARER_TOKEN"
echo "  Keep this secret — it has full orchestrator privileges."
echo ""
