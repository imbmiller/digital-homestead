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

## How to use this repo with an agent

### Option 1 — Tell your agent which module to install

The simplest approach: open a conversation with your agent and say:

> "I want to install the Jellyfin module from the Digital Homestead repo at github.com/imbmiller/digital-homestead. Read the AGENT.md file for that module and follow the instructions on my machine."

Your agent will:
1. Fetch the relevant `AGENT.md` from this repository
2. Execute each step on your machine
3. Verify the installation worked
4. Report back any issues

### Option 2 — Clone the repo and point your agent at it locally

```bash
git clone https://github.com/imbmiller/digital-homestead.git
```

Then tell your agent:

> "Read ~/digital-homestead/modules/jellyfin/AGENT.md and follow the instructions."

This is useful if you want to review the instructions yourself before running them, or if you're offline.

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
