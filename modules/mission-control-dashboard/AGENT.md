# Mission Control Dashboard — Agent Instructions

## Summary
Deploy a single-page local dashboard showing system health, all Docker containers, VPN status, storage, and backup state — no cloud dependency.

## Replaces
Datadog, New Relic, Grafana Cloud, and other cloud monitoring SaaS.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Linux host (reads `/proc`, sysfs, Docker socket, and log files directly)
- [ ] Port 8888 not in use
- [ ] Git installed

## Installation

**1. Clone the dashboard repository:**
```bash
git clone https://github.com/imbmiller/mission-control-dashboard.git ~/docker/dashboard
cd ~/docker/dashboard
```

**2. Create the environment file:**
```bash
cp .env.example .env
```

The dashboard works out of the box without any required env vars. Optionally fill in credentials to enable AdGuard DNS stats and qBittorrent download stats:

```bash
# Edit .env and add:
ADGUARD_USER=<your adguard username>
ADGUARD_PASS=<your adguard password>
QBIT_USER=admin
QBIT_PASS=<your qbittorrent password>
```

**3. Start the dashboard:**
```bash
docker compose up -d
```

**4. Verify it is running:**
```bash
docker compose ps
curl -s -o /dev/null -w "%{http_code}" http://localhost:8888
# Expected: 200
```

## Verification

Open `http://localhost:8888` — the dashboard should show:
- CPU, RAM, and temperature gauges updating in real time
- A list of all running Docker containers with colored status dots
- Disk usage bars for mounted drives
- Tailscale status (Connected / IP shown)

## Optional: Add NPM proxy host

If [proxy-stack](../proxy-stack/) is installed, add a proxy host in NPM:
- Domain: `dashboard.home`
- Forward Hostname: `host.docker.internal`
- Port: `8888`

Then `http://dashboard.home` works from any device on your network.

## Common issues

**Problem:** Dashboard shows no containers
**Fix:** The Docker socket is not mounted. Check `docker-compose.yml` for `/var/run/docker.sock:/var/run/docker.sock` volume mount. If missing, add it.

**Problem:** CPU temperature shows N/A
**Fix:** The sysfs thermal path may differ by hardware. Check available thermal zones: `ls /sys/class/thermal/`. The dashboard reads `thermal_zone0` by default — adjust in the container config if your CPU uses a different zone.

**Problem:** GPU temperature shows N/A
**Fix:** AMD GPU temperature is read from `/sys/class/drm/card0/device/hwmon/hwmon*/temp1_input`. Verify the path exists: `ls /sys/class/drm/card0/device/hwmon/`. If your GPU is on a different card (e.g. `card1`), update the config.

**Problem:** AdGuard stats not showing
**Fix:** Credentials in `.env` are wrong, or AdGuard Home is not running. Test manually: `curl -u <user>:<pass> http://localhost:3000/control/stats`.

## Useful commands
```bash
cd ~/docker/dashboard
docker compose up -d                          # start
docker compose logs -f                        # view logs
docker compose build && docker compose up -d  # rebuild after code changes
docker compose down                           # stop
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
