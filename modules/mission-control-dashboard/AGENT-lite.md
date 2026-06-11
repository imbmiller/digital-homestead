# Mission Control Dashboard — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> The full application code is included in this repository under modules/mission-control-dashboard/code/.
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Confirm Docker is installed:
```
docker --version
```

Confirm port 8888 is free:
```
sudo ss -tulnp | grep 8888
```

Expected: no output. If in use, stop and tell the user.

---

## Part 1 — Copy the code

**Step 1 — Copy the code from the repo:**
```
cp -r ~/digital-homestead/modules/mission-control-dashboard/code ~/docker/dashboard
```

**Check — Files are present:**
```
ls ~/docker/dashboard/
```

Expected: `app.py`, `Dockerfile`, `docker-compose.yml`, `requirements.txt`, `templates/`

---

## Part 2 — Configure optional credentials

The dashboard works without any configuration, but showing AdGuard and qBittorrent stats requires credentials.

**Step 2 — Create the env file:**
```
cp ~/docker/dashboard/.env.example ~/docker/dashboard/.env
```

If the user wants AdGuard stats or qBittorrent stats, open the file and add credentials:
```
nano ~/docker/dashboard/.env
```

Fill in `ADGUARD_USER`, `ADGUARD_PASS`, `QBIT_USER`, `QBIT_PASS` if desired. Leave blank to skip.

Save and close (Ctrl+X, Y, Enter).

---

## Part 3 — Adjust storage paths (if needed)

The dashboard monitors `/mnt/media` and `/mnt/backup` by default.

If the user's drives are mounted at different paths, open `app.py` and find the `get_storage_stats` function. It lists mount points — change them to match the actual paths.

If `/mnt/media` and `/mnt/backup` are correct, skip this step.

---

## Part 4 — Start the dashboard

**Step 3 — Build and start:**
```
cd ~/docker/dashboard
```

```
docker compose up -d --build
```

Wait for it to finish.

**Check — Container is running:**
```
docker ps --filter name=dashboard
```

Expected: a row showing `dashboard` with status `Up`.

If it shows `Exited`, check logs:
```
docker logs dashboard
```

---

## Check — Confirm the dashboard loads

**Step 4 — Test the web UI:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:8888
```

Expected: `200`. Open `http://localhost:8888` in a browser to see the dashboard.

You should see: CPU %, RAM, temperature gauges, a list of all running containers, and disk usage bars.

---

## Optional — Add a *.home hostname

If the proxy-stack module is installed, tell the user to add a proxy host in Nginx Proxy Manager:
- Open `http://localhost:81`
- Proxy Hosts → Add Proxy Host
- Domain: `dashboard.home`
- Forward Hostname: `host.docker.internal`
- Port: `8888`

---

## Done

Mission Control Dashboard is running at `http://localhost:8888`. If any step failed, open a feedback issue with the step number and error message.
