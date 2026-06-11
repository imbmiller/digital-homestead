# Immich — Agent Instructions

## Summary
Deploy Immich, a self-hosted Google Photos replacement with mobile backup apps, AI search, facial recognition, and location mapping.

## Replaces
Google Photos, iCloud Photos, Amazon Photos.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Storage path for photos decided (default: `/mnt/media/Photos`)
- [ ] 2 GB+ RAM available for the machine learning container
- [ ] Port 2283 not in use
- [ ] For AMD GPU acceleration: user in `render` and `video` groups (see [jellyfin](../jellyfin/) AGENT.md step 1)

## Installation

Immich provides an official install script that handles the compose file and environment setup.

**1. Create the Immich directory:**
```bash
mkdir -p ~/docker/immich
cd ~/docker/immich
```

**2. Download the official docker-compose and env files:**
```bash
wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env
```

**3. Edit the `.env` file — set your upload location:**
```bash
# Open .env and set UPLOAD_LOCATION to where you want photos stored:
sed -i 's|UPLOAD_LOCATION=.*|UPLOAD_LOCATION=/mnt/media/Photos|' .env
```

Verify the value looks correct:
```bash
grep UPLOAD_LOCATION .env
```

**4. (Optional) Enable AMD VAAPI hardware acceleration for machine learning:**

Add the following to the `immich-machine-learning` service in `docker-compose.yml`:
```yaml
    devices:
      - /dev/dri:/dev/dri
    group_add:
      - render
      - video
```

**5. Start Immich:**
```bash
docker compose up -d
```

Initial startup takes 2–3 minutes as the database initializes and ML models are downloaded.

**6. Verify all containers are running:**
```bash
docker compose ps
```
All four containers (`immich_server`, `immich_machine_learning`, `immich_postgres`, `immich_redis`) should show as healthy or running.

## Post-install configuration

**1. Create your admin account:**
Open `http://localhost:2283` — the first account created becomes the admin.

**2. Configure hardware transcoding (AMD):**
Go to **Administration → Settings → Video Transcoding**:
- Hardware Acceleration: `VAAPI`
- Device: `/dev/dri/renderD128`
- Save

**3. Install the mobile app:**
- [iOS App Store](https://apps.apple.com/app/immich/id1613945652) or [Google Play](https://play.google.com/store/apps/details?id=app.alextran.immich)
- Server URL: `http://<tailscale-ip>:2283` (use your machine's Tailscale IP for remote backup)
- Log in and enable automatic backup in the app

**4. (Optional) Add an external library:**
If you already have photos at `/mnt/media/Photos`, add it as an external library:
Go to **Administration → External Libraries → Create Library** and point it at the path.

## Verification

- Open `http://localhost:2283` — web UI loads
- Mobile app connects and starts backup
- Upload a test photo and confirm it appears in the web UI with location metadata
- Search for an object type (e.g. "dog") and confirm AI search returns results

## Common issues

**Problem:** `immich_postgres` container keeps restarting
**Fix:** The database directory may have wrong permissions. Check: `ls -la ~/docker/immich/postgres/`. The postgres container runs as UID 999 — ensure the directory is writable.

**Problem:** Machine learning container crashes with OOM error
**Fix:** The ML container needs ~2 GB RAM. If your system is constrained, set a memory limit in the compose file or disable machine learning: remove the `immich-machine-learning` service.

**Problem:** Mobile app cannot connect from outside home network
**Fix:** Use the machine's Tailscale IP as the server URL (e.g. `http://100.x.x.x:2283`). The app must be able to reach the server.

**Problem:** Photos uploaded but face recognition not running
**Fix:** Machine learning jobs run in the background. Check **Administration → Jobs → Face Detection** — trigger a manual run if needed.

## Useful commands
```bash
cd ~/docker/immich
docker compose ps                               # check status
docker compose logs -f immich-server            # server logs
docker compose logs -f immich-machine-learning  # ML logs
docker compose pull && docker compose up -d     # update all images
docker compose down                             # stop stack
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
