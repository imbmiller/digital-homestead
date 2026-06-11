# Tailscale

**Replaces:** Commercial VPN services, remote desktop tools, port forwarding, dynamic DNS

Tailscale creates a private mesh network between all your devices using WireGuard. Every device gets a stable `100.x.x.x` IP address. You can reach your home server from your phone, laptop, or any device — without opening ports on your router or paying for a VPN service.

## What you get

- Stable private IP for this machine (e.g. `100.x.x.x`)
- Access to all self-hosted services from any device on your tailnet
- Split-tunnel routing (only `100.x.x.x` traffic goes through Tailscale, everything else goes direct)
- Optional split DNS: resolve `*.home` names from remote devices via your local AdGuard instance

## Requirements

- Ubuntu 24.04 LTS
- A free Tailscale account at [tailscale.com](https://tailscale.com)

## Notes

Tailscale's free tier supports up to 100 devices and 3 users — more than enough for a personal homestead. The free tier does not expire.

If you also run Surfshark: do not enable Surfshark's kill switch. It will block Tailscale's UDP handshakes. See the [surfshark](../surfshark/) module.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
