# Digital Homestead

**Take back control of your digital life.**

Digital Homestead is a collection of self-hosting modules that help you replace streaming services, SaaS subscriptions, and cloud dependencies with software you run on your own hardware.

Each module is a set of instructions — not code — that you or your AI agent can follow to get a service running on your machine.

---

## How to use this with an agent

1. Point your AI agent at this repository
2. Tell it which module(s) you want to install
3. Your agent reads `modules/<name>/AGENT.md` and executes the steps on your computer

No cloud account required. No agent writes code back to this repo. Your hardware, your data, your rules.

---

## Modules

| Module | Replaces | Notes |
|--------|----------|-------|
| [docker](modules/docker/) | — | **Required first.** Foundation for all other modules |
| [portainer](modules/portainer/) | Rancher, Lens | Docker management UI |
| [tailscale](modules/tailscale/) | Commercial VPN, remote desktop services | Private network between your devices |
| [surfshark](modules/surfshark/) | ExpressVPN, NordVPN | Privacy VPN for specific containers |
| [proxy-stack](modules/proxy-stack/) | Cloudflare Proxy, paid reverse proxies | Local DNS + HTTPS reverse proxy |
| [jellyfin](modules/jellyfin/) | Netflix, Hulu, Plex Pass | Media server for your own library |
| [media-stack](modules/media-stack/) | Manual torrenting, streaming services | Automated media acquisition + management |
| [immich](modules/immich/) | Google Photos, iCloud Photos | Photo and video backup + AI search |
| [homebase-budget](modules/homebase-budget/) | Mint, YNAB, Personal Capital | Self-hosted personal finance kanban |
| [mission-control-dashboard](modules/mission-control-dashboard/) | Datadog, cloud monitoring dashboards | Local system + service dashboard |

---

## Recommended install order

For a complete homestead from scratch:

```
docker → portainer → tailscale → proxy-stack
       → jellyfin → media-stack
       → immich
       → homebase-budget
       → mission-control-dashboard
```

`surfshark` can be installed alongside `tailscale` if you want per-container VPN routing for privacy-sensitive services.

---

## Agent feedback

If your agent runs into a problem during a module setup, please [open a feedback issue](https://github.com/imbmiller/digital-homestead/issues/new?template=agent-feedback.yml). Confirmed workarounds get incorporated directly into the module instructions as model-specific notes.

---

## Contributing a module

Have a self-hosted solution worth sharing? See [CONTRIBUTING.md](CONTRIBUTING.md) for the module structure standard and PR process.

---

## Philosophy

See [MANIFESTO.md](MANIFESTO.md).

## Wiki

[https://imbmiller.github.io/digital-homestead](https://imbmiller.github.io/digital-homestead)
