---
title: Getting Started
nav_order: 2
---

# Getting Started

## What you need

- A Linux machine (Ubuntu 24.04 LTS recommended) with 8+ GB RAM
- An AI agent (Claude, GPT-4o, Gemini, or any agent that can execute shell commands)
- About 30 minutes per module

No cloud account required. No registration. No telemetry.

---

## Step 0 — Clone the repo first (required)

Always start by cloning this repo locally. Many modules include ready-to-use config files and application code that your agent copies directly — this avoids generating files from scratch and reduces errors and token usage.

```bash
git clone https://github.com/imbmiller/digital-homestead.git ~/digital-homestead
```

All module instructions assume the repo is at `~/digital-homestead`.

---

## How to use this repo with an agent

### Capable models (100B+ parameters, or hosted models like Claude, GPT-4o, Gemini)

Tell your agent:

> "Read ~/digital-homestead/modules/jellyfin/AGENT.md and follow the instructions on my machine."

Your agent will read the instructions, copy config files from the repo, execute steps, verify the result, and report any issues.

### Smaller local models (under 100B parameters)

Use the `AGENT-lite.md` file instead. These give one command at a time with explicit verification after each step, and avoid complex shell constructs that smaller models are more likely to get wrong.

Tell your agent:

> "Read ~/digital-homestead/modules/jellyfin/AGENT-lite.md and follow the instructions on my machine."

### Which file to use?

| Model type | File to use |
|------------|-------------|
| Claude, GPT-4o, Gemini | `AGENT.md` |
| Llama 3.1 70B, Qwen 72B | Either — try `AGENT.md` first |
| Llama 3.1 8B, Mistral 7B, Phi-4 14B, Qwen 7B–14B | `AGENT-lite.md` |

---

## Install order

Some modules depend on others. Follow this order for a complete setup:

```
1. docker          ← required by everything else
2. portainer       ← optional but recommended for managing containers
3. tailscale       ← private network between your devices
4. proxy-stack     ← local DNS + reverse proxy for *.home URLs
5. jellyfin        ← media server
6. media-stack     ← automated media acquisition (requires jellyfin + surfshark)
7. surfshark       ← VPN (required by media-stack for private torrenting)
8. immich          ← photo backup
9. homebase-budget ← personal finance
10. mission-control-dashboard ← system dashboard
```

You don't need all of them. Install only what replaces something you currently pay for.

---

## What your agent can and cannot do

**Can do:**
- Run shell commands on your machine
- Create files and directories
- Pull Docker images and start containers
- Edit configuration files
- Open URLs to verify services are running

**Cannot do:**
- Complete browser-based authentication flows on your behalf (e.g. Tailscale login, Surfshark login) — these require you to open a URL in your browser
- Accept self-signed TLS certificate warnings in your browser
- Configure services that require clicking through a web UI for first-time setup (your agent will tell you exactly what to click)

---

## After installation

Once a module is running, your agent's job is done. You manage the service yourself:
- Use the web UI (e.g. `http://localhost:8096` for Jellyfin)
- Update containers with `docker compose pull && docker compose up -d`
- Check logs with `docker compose logs -f`

---

## Something went wrong?

If your agent hit a problem during setup, [submit a feedback issue](feedback.md). Your experience helps improve the instructions for everyone.
