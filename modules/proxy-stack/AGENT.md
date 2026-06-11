# Proxy Stack — Agent Instructions

## Summary
Deploy Nginx Proxy Manager and AdGuard Home as a local DNS + reverse proxy stack, enabling `*.home` hostname routing for all self-hosted services.

## Replaces
Cloudflare Proxy, paid reverse proxy services, manual `/etc/hosts` editing.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Ports 53, 80, 81, 443, 3000 free on the host
- [ ] Know this machine's Tailscale IP (run `tailscale ip` — needed for DNS rewrite config)

## Installation

**1. Create the compose directory:**
```bash
mkdir -p ~/docker/proxy-stack
```

**2. Create the compose file:**
```bash
cat > ~/docker/proxy-stack/docker-compose.yml << 'EOF'
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: npm
    restart: unless-stopped
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    extra_hosts:
      - "host.docker.internal:host-gateway"

  adguard:
    image: adguard/adguardhome:latest
    container_name: adguard
    restart: unless-stopped
    network_mode: host
    volumes:
      - adguard_work:/opt/adguardhome/work
      - adguard_conf:/opt/adguardhome/conf

volumes:
  npm_data:
  npm_letsencrypt:
  adguard_work:
  adguard_conf:
EOF
```

**3. Disable systemd-resolved's stub listener** (it occupies port 53):
```bash
sudo sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf
sudo systemctl restart systemd-resolved
```

**4. Tell NetworkManager not to manage `/etc/resolv.conf`:**
```bash
sudo mkdir -p /etc/NetworkManager/conf.d
sudo tee /etc/NetworkManager/conf.d/dns-none.conf > /dev/null << 'EOF'
[main]
dns=none
EOF
```

**5. Lock `/etc/resolv.conf` to point at AdGuard with a fast fallback:**
```bash
sudo chattr -i /etc/resolv.conf 2>/dev/null || true
sudo tee /etc/resolv.conf > /dev/null << 'EOF'
nameserver 127.0.0.1
nameserver 1.1.1.1
options timeout:1 attempts:1
EOF
sudo chattr +i /etc/resolv.conf
```
The `chattr +i` makes the file immutable so NetworkManager and systemd-resolved cannot overwrite it after reboots.

**6. Start the stack:**
```bash
cd ~/docker/proxy-stack
docker compose up -d
```

## Post-install configuration

### Step 1 — AdGuard Home setup wizard

Open `http://localhost:3000` in a browser.

1. Click **Get Started → Next → Next**
2. On the **Admin Web Interface** page, change port from `80` to `3000`
3. Set a username and password, then finish the wizard
4. Go to **Filters → DNS Rewrites** → Add rewrite:
   - Domain: `*.home`
   - IP: this machine's Tailscale IP (run `tailscale ip` to get it), or `127.0.0.1` for local-only
5. Go to **Settings → DNS Settings** → set upstream DNS to `1.1.1.1`

### Step 2 — Nginx Proxy Manager setup

Open `http://localhost:81` in a browser.

Default credentials: `admin@example.com` / `changeme` — change them immediately on first login.

For each service you want to access by hostname, add a proxy host:
- Go to **Proxy Hosts → Add Proxy Host**
- Domain: `<service>.home`
- Forward Hostname: `host.docker.internal`
- Forward Port: the service's host port
- Enable **Websockets Support** for Portainer and any real-time services

Example entries:

| Domain | Forward Port |
|--------|-------------|
| jellyfin.home | 8096 |
| portainer.home | 9443 |
| immich.home | 2283 |
| adguard.home | 3000 |
| dashboard.home | 8888 |

### Step 3 — Optional: Tailscale split DNS

To resolve `*.home` names from any device on your Tailscale network:

1. Open [Tailscale admin console](https://login.tailscale.com/admin/dns)
2. Under **Nameservers**, click **Add nameserver → Custom**
3. Enter this machine's Tailscale IP
4. Enable **Restrict to domain**, enter `home`
5. Save

Now `http://jellyfin.home` works from your phone, laptop, or any device on your tailnet.

## Verification

```bash
# Confirm AdGuard is resolving *.home
nslookup jellyfin.home 127.0.0.1

# Confirm NPM is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:81
# Expected: 200
```

Visit `http://jellyfin.home` (if Jellyfin is installed) — it should route correctly.

## Common issues

**Problem:** Port 53 already in use when starting AdGuard
**Fix:** systemd-resolved stub listener is still active. Verify: `sudo systemctl status systemd-resolved` and check `DNSStubListener=no` in `/etc/systemd/resolved.conf`. Restart resolved: `sudo systemctl restart systemd-resolved`.

**Problem:** `/etc/resolv.conf` gets overwritten after reboot
**Fix:** Ensure `chattr +i` was applied: `lsattr /etc/resolv.conf` should show `----i`. If not, re-apply step 5.

**Problem:** `*.home` resolves locally but not from other devices
**Fix:** Tailscale split DNS is not configured. Complete Step 3 above.

**Problem:** NPM returns 502 for a proxy host
**Fix:** The target service is not running, or the port is wrong. Verify the service is up with `docker ps` and confirm the port in the NPM proxy host config.

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
