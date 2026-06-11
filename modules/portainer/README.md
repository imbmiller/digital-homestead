# Portainer

**Replaces:** Manually running `docker` CLI commands, Rancher, Lens

Portainer is a web-based Docker management UI. It lets you start, stop, inspect, and update containers, view logs, and manage volumes and networks — all from a browser instead of the terminal.

## What you get

- Web UI at `https://localhost:9443`
- Container management (start/stop/restart/logs/inspect)
- Volume and network management
- Image pull and update
- Always-on (restarts on boot)

## Requirements

- [docker](../docker/) installed

## Notes

Portainer uses a self-signed TLS certificate by default. Your browser will warn you — accept the exception. The admin account must be created within 5 minutes of first launch, or Portainer locks itself and needs to be restarted.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
