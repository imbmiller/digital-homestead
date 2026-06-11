# Media Stack — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.
> This module has 8 containers. Install them all at once. Do not skip steps.

---

## Before you start

Confirm these are already installed:
```
docker --version
```

Confirm Surfshark is installed and you have a WireGuard private key:
- The user must have generated a WireGuard key at: Surfshark dashboard → Manual Setup → WireGuard → Generate Key
- The key looks like a long base64 string

Confirm media directories exist:
```
ls /mnt/media/
```

Expected: directories named `Movies`, `TV`, `Music`, `Books`, `Downloads`.

If any are missing, create them:
```
sudo mkdir -p /mnt/media/Movies /mnt/media/TV /mnt/media/Music /mnt/media/Books /mnt/media/Downloads
```

Then fix permissions:
```
sudo chown -R $USER:$USER /mnt/media
```

---

## Part 1 — Create files

**Step 1 — Create the directory:**
```
mkdir -p ~/docker/media-stack
```

**Step 2 — Copy the compose file from the repo:**
```
cp ~/digital-homestead/modules/media-stack/docker-compose.yml ~/docker/media-stack/docker-compose.yml
```

**Step 3 — Copy the env example file:**
```
cp ~/digital-homestead/modules/media-stack/.env.example ~/docker/media-stack/.env
```

---

## Part 2 — Configure the env file

**Step 4 — Get your user ID:**
```
id
```

Write down the numbers after `uid=` and `gid=`. Usually both are `1000`.

**Step 5 — Edit the env file:**
```
nano ~/docker/media-stack/.env
```

Fill in these values:
- `WIREGUARD_PRIVATE_KEY=` — paste the WireGuard key the user got from Surfshark
- `PUID=` — the uid number from step 4 (usually 1000)
- `PGID=` — the gid number from step 4 (usually 1000)
- Leave `MEDIA_ROOT=/mnt/media` as-is unless the user's media is in a different location

Save and close (Ctrl+X, Y, Enter).

**Check — Verify the key was saved:**
```
grep WIREGUARD_PRIVATE_KEY ~/docker/media-stack/.env
```

Expected: the line should show the key you pasted, not `YOUR_WIREGUARD_PRIVATE_KEY_HERE`.

---

## Part 3 — Start the stack

**Step 6 — Start all containers:**
```
cd ~/docker/media-stack
```

```
docker compose up -d
```

This will download several Docker images. It may take 5–10 minutes. Wait for it to finish.

---

## Part 4 — Verify VPN connection

**Step 7 — Check gluetun VPN logs:**
```
docker logs gluetun 2>&1 | grep -i "connected\|VPN is up\|public ip"
```

Expected: a line saying the VPN is connected or showing a Public IP.

If you see `AUTH_FAILED` or `HANDSHAKE_TIMEOUT`, the WireGuard key is wrong. The user needs to generate a new one from the Surfshark dashboard and update `.env`. Then run:
```
docker compose restart gluetun
```

**Step 8 — Confirm qBittorrent is routing through VPN (not your home IP):**
```
docker exec qbittorrent curl -s https://api.ipify.org
```

Expected: an IP address that is NOT the user's home internet IP. It should be a Surfshark server IP.

If it returns the home IP, gluetun is not connected. Do not continue until gluetun shows connected.

**Check — All containers running:**
```
docker compose ps
```

Expected: all 8 containers show status `Up`. If any show `Exited`, check that container's logs.

---

## Part 5 — Connect services (browser steps)

Tell the user to do each of the following. They can do them one at a time.

**Connect Prowlarr to all *arr apps:**
1. Open `http://localhost:9696`
2. Go to Settings → Apps
3. Add Radarr (port 7878), Sonarr (8989), Lidarr (8686), Readarr (8787)
4. Get each app's API key from that app's Settings → General page

**Set download client in each *arr app (repeat for Sonarr, Radarr, Lidarr, Readarr):**
1. Open the app (e.g. `http://localhost:8989` for Sonarr)
2. Go to Settings → Download Clients → Add
3. Type: qBittorrent
4. Host: `gluetun` (not localhost — qBittorrent runs inside gluetun's network)
5. Port: `8080`
6. Test and Save

**Set up Jellyseerr:**
1. Open `http://localhost:5055`
2. Sign in with your Jellyfin account
3. Go to Settings → Services and connect Radarr and Sonarr

Wait for user to confirm.

---

## Final check

1. Open Jellyseerr at `http://localhost:5055`
2. Search for a movie and request it
3. Check Radarr at `http://localhost:7878` — the movie should appear
4. Check qBittorrent at `http://localhost:8080` — a download should start

---

## Done

Media stack is running with 8 containers behind a VPN. If any step failed, open a feedback issue with the step number and error message.
