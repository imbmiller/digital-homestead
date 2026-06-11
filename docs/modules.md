---
title: Module Catalog
nav_order: 3
---

# Module Catalog

Each module replaces one or more subscription services or cloud dependencies with software you self-host.

---

## Foundation

### [docker](https://github.com/imbmiller/digital-homestead/tree/main/modules/docker)

Required by every other module. Installs Docker CE, Docker Compose, and Docker Buildx on Ubuntu with container DNS configured correctly.

---

## Networking & Access

### [portainer](https://github.com/imbmiller/digital-homestead/tree/main/modules/portainer)

**Replaces:** Manually running docker CLI commands, Rancher, Lens

Web-based Docker management UI. Start, stop, inspect, and update containers from a browser. Available at `https://localhost:9443`.

---

### [tailscale](https://github.com/imbmiller/digital-homestead/tree/main/modules/tailscale)

**Replaces:** Commercial VPN services, remote desktop tools, dynamic DNS, port forwarding

Creates a private WireGuard mesh network between all your devices. Every device gets a stable `100.x.x.x` IP. Access your home server from anywhere without opening router ports.

---

### [surfshark](https://github.com/imbmiller/digital-homestead/tree/main/modules/surfshark)

**Replaces:** ExpressVPN, NordVPN, other privacy VPNs

Routes specific container traffic through an external VPN server. Primarily used by the media-stack module to anonymize torrent traffic via gluetun.

*Requires a Surfshark subscription.*

---

### [proxy-stack](https://github.com/imbmiller/digital-homestead/tree/main/modules/proxy-stack)

**Replaces:** Cloudflare Proxy, paid reverse proxies, manual /etc/hosts editing

Nginx Proxy Manager + AdGuard Home. Gives every self-hosted service a human-readable hostname (`jellyfin.home`, `immich.home`, etc.) with optional ad blocking. Works locally and over Tailscale.

---

## Media

### [jellyfin](https://github.com/imbmiller/digital-homestead/tree/main/modules/jellyfin)

**Replaces:** Netflix, Hulu, Disney+, Plex Pass, Emby

Open-source media server for your personal movie, TV, music, and book library. Streams to browsers, phones, TVs, and Chromecast. Hardware-accelerated transcoding included at no cost.

---

### [media-stack](https://github.com/imbmiller/digital-homestead/tree/main/modules/media-stack)

**Replaces:** Manual torrenting, streaming service subscriptions for content you can own

8-container automation stack: VPN-routed torrent client (qBittorrent via gluetun), indexer manager (Prowlarr), and separate automations for TV (Sonarr), movies (Radarr), music (Lidarr), books (Readarr), and a request front-end (Jellyseerr). Request something → it downloads and appears in Jellyfin.

*Requires jellyfin + surfshark.*

---

## Photos

### [immich](https://github.com/imbmiller/digital-homestead/tree/main/modules/immich)

**Replaces:** Google Photos, iCloud Photos, Amazon Photos

Full-featured photo and video backup platform with mobile apps (iOS + Android), AI-powered search, facial recognition, location mapping, and album sharing.

---

## Finance

### [homebase-budget](https://github.com/imbmiller/digital-homestead/tree/main/modules/homebase-budget)

**Replaces:** Mint, YNAB, Personal Capital, Monarch Money

Self-hosted personal finance kanban. Import bank CSV exports, drag transactions to categories, set monthly budgets, track over/under. Your financial data stays on your machine.

---

## Monitoring

### [mission-control-dashboard](https://github.com/imbmiller/digital-homestead/tree/main/modules/mission-control-dashboard)

**Replaces:** Datadog, New Relic, Grafana Cloud, cloud monitoring dashboards

Single-page local dashboard showing CPU/RAM/temperature, disk usage, all Docker container statuses, Tailscale and VPN connection state, backup status, and optional AdGuard and qBittorrent stats.

---

## Add your own

Have a self-hosted service that belongs here? See [Contributing](contributing.md) for the module structure standard and PR process.
