# Mission Control Dashboard

**Replaces:** Datadog, New Relic, Grafana Cloud, cloud monitoring SaaS subscriptions

A single-page local dashboard that shows the live state of your entire homestead at a glance — system health, all Docker containers, VPN status, storage usage, backup status, and more.

## What you get

- CPU %, RAM usage, CPU and GPU temperature (AMD Radeon via sysfs)
- Disk usage bars: system NVMe, `/mnt/media`, `/mnt/backup`
- All Docker containers with status indicators and clickable `.home` links
- Tailscale connection status and Tailscale IP
- Surfshark VPN status (WireGuard interface detection)
- Nightly backup last run status (from log file)
- AdGuard DNS stats (queries/day, % blocked) — requires credentials
- qBittorrent active downloads and speed — requires credentials
- Last unattended-upgrades log entry

## Requirements

- [docker](../docker/) installed
- Linux host (reads `/proc`, `sysfs`, Docker socket, and log files)
- Optional: [proxy-stack](../proxy-stack/) for `dashboard.home` hostname

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
