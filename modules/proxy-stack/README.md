# Proxy Stack

**Replaces:** Cloudflare Proxy, paid reverse proxies, manual `/etc/hosts` editing, router-level DNS

A two-container stack — **Nginx Proxy Manager** (NPM) and **AdGuard Home** — that gives your local network human-readable hostnames (e.g. `jellyfin.home`) and HTTPS reverse proxy routing without any cloud dependency.

## What you get

- **AdGuard Home:** Local DNS resolver that maps `*.home` names to your server's IP. Also blocks ads and trackers for all devices on your network.
- **Nginx Proxy Manager:** Web-based reverse proxy that routes `jellyfin.home` to `localhost:8096`, handles SSL termination, and provides a click-based config UI instead of editing nginx config files.
- Human-readable URLs for every service: `jellyfin.home`, `portainer.home`, `immich.home`, etc.
- Split DNS via Tailscale: optionally extend `*.home` resolution to all your remote devices

## Requirements

- [docker](../docker/) installed
- [tailscale](../tailscale/) installed (optional, for remote `*.home` access)
- Ports 80, 81, 443, 53, 3000 not in use on the host

## Architecture

```
Browser → *.home → AdGuard DNS (port 53) → resolves to 127.0.0.1
                                                     ↓
                                        Nginx Proxy Manager (port 80/443)
                                                     ↓
                                          Target container (port XXXX)
```

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
