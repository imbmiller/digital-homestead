# Immich — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Confirm Docker is installed:
```
docker --version
```

Confirm the photo storage location exists (default is `/mnt/media/Photos`):
```
ls /mnt/media/Photos
```

If it does not exist, create it:
```
sudo mkdir -p /mnt/media/Photos
```

Then fix permissions:
```
sudo chown -R $USER:$USER /mnt/media/Photos
```

---

## Part 1 — Create directory and download files

**Step 1 — Create the directory:**
```
mkdir -p ~/docker/immich
```

```
cd ~/docker/immich
```

**Step 2 — Download the official Immich compose file:**
```
wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
```

**Step 3 — Download the environment file template:**
```
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env
```

**Check — Both files exist:**
```
ls ~/docker/immich/
```

Expected: `docker-compose.yml` and `.env`

---

## Part 2 — Set the photo storage location

**Step 4 — Set UPLOAD_LOCATION in the env file:**
```
sed -i 's|UPLOAD_LOCATION=.*|UPLOAD_LOCATION=/mnt/media/Photos|' ~/docker/immich/.env
```

**Check — Confirm it was set:**
```
grep UPLOAD_LOCATION ~/docker/immich/.env
```

Expected: `UPLOAD_LOCATION=/mnt/media/Photos`

If the user wants photos stored somewhere different, replace `/mnt/media/Photos` with their path in the sed command above.

---

## Part 3 — Start Immich

**Step 5 — Start all containers:**
```
cd ~/docker/immich
```

```
docker compose up -d
```

Immich downloads several images and initializes a database. This may take 3–5 minutes.

**Step 6 — Wait for initialization:**
```
sleep 60
```

**Check — All containers are running:**
```
docker compose ps
```

Expected: four containers (`immich_server`, `immich_machine_learning`, `immich_postgres`, `immich_redis`) all showing `Up` or `healthy`.

If any show `Exited`, check logs:
```
docker compose logs immich-server
```

---

## Part 4 — First-time setup (browser steps)

Tell the user to do the following:

1. Open `http://localhost:2283`
2. The first account created becomes the admin — set a strong password
3. After logging in, go to Administration → Settings → Video Transcoding (AMD GPU only):
   - Hardware Acceleration: VAAPI
   - Device: `/dev/dri/renderD128`
   - Save

**Mobile app setup:**
Tell the user to install the Immich app on their phone (iOS App Store or Google Play Store, search "Immich"). Set the server URL to:
- On home network: `http://[machine-local-ip]:2283`
- Remote access via Tailscale: `http://[tailscale-ip]:2283`

Wait for user to confirm they can log in.

---

## Final check

**Confirm web UI is accessible:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:2283
```

Expected: `200`

---

## Done

Immich is installed. Photos uploaded via the mobile app will appear in the web UI. If any step failed, open a feedback issue with the step number and error message.
