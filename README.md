# Digital Homestead

**Unplug from the SAAS machine. Own your own data. Produce something beautiful.**

I'm a tech nerd. I love cutting edge technology and software that add value to my life. I am also sick of paying for all these services on a recurring billing cycle - my only recognition is in revenue for a monolithic multinational corporation. From this is born the Digital Homestead. Certainly not an original idea but hopefully this moment and this idea connect with you. The idea is free, the project is free, the resulting software and hardware are owned by you alone. The advent of even moderately smart local llms has made it possible for anyone to participate in this project in their own lives. Point your agent here and lets see what we can build together. 

Each module is a set of instructions — and starter code — that you or your AI agent can follow to get a service running on your machine.

---

## How to use this with an agent

**Step 0 — Clone the repo first (always):**
```bash
git clone https://github.com/imbmiller/digital-homestead.git ~/digital-homestead
```

Cloning first lets your agent copy ready-made config files and application code from the repo instead of generating them from scratch — fewer tokens, fewer errors.

**Then tell your agent which module to install:**

For capable models (Claude, GPT-4o, Gemini, 100B+ local models):
> "Read ~/digital-homestead/modules/jellyfin/AGENT.md and follow the instructions on my machine."

For smaller local models (under 100B parameters — Llama 8B, Mistral 7B, Phi-4, Qwen 7B–14B):
> "Read ~/digital-homestead/modules/jellyfin/AGENT-lite.md and follow the instructions on my machine."

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
