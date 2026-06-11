# Tailscale — Agent Instructions

## Summary
Install Tailscale to create a private WireGuard mesh network between this machine and all your other devices.

## Replaces
Commercial VPN services (for remote access), dynamic DNS, port forwarding.

## Prerequisites
- [ ] Ubuntu 24.04 LTS
- [ ] User has `sudo` access
- [ ] A Tailscale account exists at tailscale.com (free tier is sufficient)

## Installation

**1. Add Tailscale's APT repository and install:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**2. Enable and start the Tailscale service:**
```bash
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

**3. Authenticate this machine to your tailnet:**
```bash
sudo tailscale up
```

This prints an authentication URL. Open it in a browser and log in to your Tailscale account to approve the machine.

**4. Confirm the machine is connected and get its IP:**
```bash
tailscale ip
tailscale status
```

Expected: a `100.x.x.x` IP address and status showing `Connected`.

## Verification

From another device on your tailnet (phone, laptop), ping this machine's Tailscale IP:
```bash
ping 100.x.x.x
```

If you have other self-hosted services running, try reaching them via the Tailscale IP (e.g. `http://100.x.x.x:8096` for Jellyfin).

## Optional: Split DNS for *.home names

If you install the [proxy-stack](../proxy-stack/) module (AdGuard Home), you can configure Tailscale to resolve `*.home` names from any device on your tailnet:

1. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), go to **DNS**
2. Under **Nameservers**, click **Add nameserver → Custom**
3. Enter this machine's Tailscale IP (e.g. `100.x.x.x`)
4. Enable **Restrict to domain**, enter `home`
5. Save

Now `http://jellyfin.home` resolves from any Tailscale-connected device.

## Common issues

**Problem:** `tailscale up` prints a URL but the machine never shows as connected
**Fix:** Ensure the authentication URL is opened in a browser where you are logged into the correct Tailscale account. The link expires after a few minutes — run `sudo tailscale up` again if needed.

**Problem:** `tailscaled.service` fails to start
**Fix:** Check for kernel module issues: `sudo dmesg | grep -i wireguard`. On some kernels, `wireguard` must be loaded manually: `sudo modprobe wireguard`.

**Problem:** Services reachable on LAN but not over Tailscale
**Fix:** Confirm the service is bound to `0.0.0.0` (not just `127.0.0.1`). Docker containers are typically fine; host services may need to have their bind address changed.

**Problem:** Tailscale conflicts with Surfshark kill switch
**Fix:** Disable Surfshark's kill switch. See the [surfshark](../surfshark/) module notes.

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
