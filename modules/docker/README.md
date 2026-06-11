# Docker

**Replaces:** Nothing — this is the foundation every other module builds on.

Docker lets you run isolated services in containers without cluttering your host system. Every module in this repo assumes Docker CE and Docker Compose are installed.

## What you get

- Docker CE (container runtime)
- Docker Compose plugin (for multi-container stacks)
- Docker Buildx plugin
- Your user added to the `docker` group (run without `sudo`)
- Explicit DNS configuration (`1.1.1.1`, `8.8.8.8`) applied to all containers

## Requirements

- Ubuntu 24.04 LTS (or compatible Debian-based distro)
- `sudo` access
- Internet connection for package downloads

## Notes

The DNS override (`/etc/docker/daemon.json`) is important if you run a local DNS resolver like AdGuard Home. Docker containers use a separate network namespace and cannot reach `127.0.0.1` on the host, so they need explicit upstream DNS servers.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
