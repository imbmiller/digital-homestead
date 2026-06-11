# Surfshark

**Replaces:** ExpressVPN, NordVPN, and other commercial VPN subscriptions

Surfshark routes outbound traffic through an external VPN server, masking your ISP-visible IP. In a self-hosting context, it's used for specific containers that benefit from privacy routing — primarily the `qBittorrent` container in the [media-stack](../media-stack/) module.

## What you get

- WireGuard-based VPN (fast, low overhead)
- Per-container VPN routing via the `gluetun` network namespace in media-stack
- Auto-update cron job (Surfshark uses its own repo and won't update via `unattended-upgrades`)

## Requirements

- Ubuntu 24.04 LTS
- A Surfshark subscription (not free)

## Coexistence with Tailscale

Both can run simultaneously. Tailscale uses split tunneling and only routes `100.x.x.x` traffic through its interface — it does not conflict with Surfshark routing other traffic.

**Critical:** Do **not** enable Surfshark's kill switch if you are also running Tailscale. The kill switch blocks all non-VPN traffic, including Tailscale's UDP handshakes, breaking your remote access.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
