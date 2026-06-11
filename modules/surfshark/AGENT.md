# Surfshark — Agent Instructions

## Summary
Install Surfshark VPN on Ubuntu for per-container privacy routing (primarily used with the media-stack module).

## Replaces
ExpressVPN, NordVPN, and other commercial VPN subscriptions.

## Prerequisites
- [ ] Ubuntu 24.04 LTS
- [ ] User has `sudo` access
- [ ] Active Surfshark subscription
- [ ] Surfshark account credentials (email + password)

## Installation

**1. Add Surfshark's APT repository:**
```bash
curl -f https://downloads.surfshark.com/linux/debian-install.sh | sudo sh
```

**2. Install Surfshark:**
```bash
sudo apt-get install -y surfshark
```
WireGuard is installed automatically as a dependency.

**3. Set up an auto-update cron job:**

Surfshark uses its own APT repo and is excluded from `unattended-upgrades`. Create a cron job to keep it updated:

```bash
sudo tee /usr/local/bin/surfshark-update.sh > /dev/null << 'EOF'
#!/bin/bash
apt-get update -qq && apt-get install -y --only-upgrade surfshark >> /var/log/surfshark-update.log 2>&1
EOF
sudo chmod +x /usr/local/bin/surfshark-update.sh

sudo tee /etc/cron.d/surfshark-update > /dev/null << 'EOF'
30 7 * * * root /usr/local/bin/surfshark-update.sh
EOF
```

**4. Authenticate (requires browser):**
```bash
surfshark-vpn login
```
This opens a browser-based authentication flow. Complete it with your Surfshark credentials.

**5. Connect:**
```bash
surfshark-vpn up
```
Connects to the nearest/fastest server.

## Verification

**Confirm VPN traffic is routing correctly:**
```bash
curl -s https://api.ipify.org
```
Should return a Surfshark IP, not your ISP's IP.

**Check the WireGuard interface exists:**
```bash
ip route | grep wg-surfshark
```
Expected: a default route via the `wg-surfshark` interface.

## Important: Kill switch warning

Do **not** enable Surfshark's kill switch if you are running Tailscale. The kill switch blocks all non-VPN traffic, which includes Tailscale's UDP connections, breaking your tailnet access.

Leave kill switch disabled:
```bash
surfshark-vpn settings  # verify kill switch is OFF
```

## Common issues

**Problem:** `surfshark-vpn login` does not open a browser
**Fix:** The command prints a URL — open it manually in a browser.

**Problem:** VPN connects but `curl https://api.ipify.org` still shows your ISP IP
**Fix:** Wait 10–15 seconds after `surfshark-vpn up` for the route to propagate. Run `ip route` to confirm the `wg-surfshark` interface appears.

**Problem:** Surfshark and Tailscale both running but Tailscale drops connection
**Fix:** The Surfshark kill switch is enabled. Run `surfshark-vpn settings` and disable it.

**Problem:** `apt-get install surfshark` fails with GPG error
**Fix:** Re-run the repo setup: `curl -f https://downloads.surfshark.com/linux/debian-install.sh | sudo sh` and retry.

## Useful commands
```bash
surfshark-vpn status    # connection status + current server
surfshark-vpn up        # connect
surfshark-vpn down      # disconnect
surfshark-vpn attack    # interactive country/server selector
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
