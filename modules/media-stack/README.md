# Media Stack

**Replaces:** Manual torrent management, streaming services for content you can own

An 8-container automation stack that handles finding, downloading, organizing, and serving your media library. You tell it what you want; it handles the rest.

## Services

| Container | Port | Role |
|-----------|------|------|
| gluetun | — | VPN gateway (all torrent traffic routes through this) |
| qBittorrent | 8080 | Torrent client (runs inside gluetun's VPN namespace) |
| Prowlarr | 9696 | Indexer manager (finds torrent sources) |
| Sonarr | 8989 | TV show automation |
| Radarr | 7878 | Movie automation |
| Lidarr | 8686 | Music automation |
| Readarr | 8787 | Book and audiobook automation |
| Jellyseerr | 5055 | Request front-end (browse and request movies + TV) |

## What you get

- Request a movie or show in Jellyseerr → it's automatically found, downloaded, renamed, and added to Jellyfin
- All torrent traffic is routed through a VPN (Surfshark via gluetun)
- Prowlarr connects your indexers to all the *arr apps simultaneously
- Organized library structure ready for Jellyfin consumption

## Requirements

- [docker](../docker/) installed
- [jellyfin](../jellyfin/) installed (for consuming the library)
- [surfshark](../surfshark/) installed (for the VPN WireGuard key)
- A Surfshark account with a WireGuard private key (get from Surfshark dashboard → Manual Setup → WireGuard)
- Storage mounted and writable at `/mnt/media` (or adjust paths)

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
