# Module Index

Each module replaces a subscription service or cloud dependency with software you run yourself.

Install `docker` first — every other module depends on it.

| Module | Replaces | RAM | Disk |
|--------|----------|-----|------|
| [docker](docker/) | — (foundation) | — | — |
| [portainer](portainer/) | Rancher, Lens | ~50 MB | ~500 MB |
| [tailscale](tailscale/) | Commercial VPN, remote desktop | ~20 MB | ~100 MB |
| [surfshark](surfshark/) | ExpressVPN, NordVPN | ~10 MB | ~200 MB |
| [proxy-stack](proxy-stack/) | Cloudflare Proxy, paid reverse proxies | ~100 MB | ~500 MB |
| [jellyfin](jellyfin/) | Netflix, Hulu, Plex Pass | ~500 MB | your media |
| [media-stack](media-stack/) | Manual torrenting, streaming services | ~1 GB | your media |
| [immich](immich/) | Google Photos, iCloud Photos | ~2 GB | your photos |
| [homebase-budget](homebase-budget/) | Mint, YNAB, Personal Capital | ~200 MB | ~100 MB |
| [mission-control-dashboard](mission-control-dashboard/) | Datadog, cloud monitoring | ~100 MB | ~100 MB |

## Module structure

Each module follows this layout:

```
modules/<name>/
├── README.md      # Human overview: what it is, what it replaces
├── AGENT.md       # Step-by-step agent install instructions
└── <model>.md     # Model-specific workarounds (added as feedback is incorporated)
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full module standard.
