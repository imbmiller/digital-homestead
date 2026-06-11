# Jellyfin — Agent Instructions

## Summary
Deploy Jellyfin media server in Docker to serve your personal movie, TV, music, and book library to any device on your network.

## Replaces
Netflix, Hulu, Disney+, Plex Pass, Emby.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Media files exist on disk (movies, TV shows, music, etc.)
- [ ] Know the host paths to your media directories
- [ ] For AMD GPU hardware transcoding: add user to `render` and `video` groups (see step 1)

## Installation

**1. (AMD GPU only) Add your user to the render and video groups:**
```bash
sudo usermod -aG render,video $USER
```
Log out and back in, or run `newgrp render` for the session.

Verify: `groups | grep -E "render|video"`

**2. Create the Jellyfin directory:**
```bash
mkdir -p ~/docker/jellyfin
```

**3. Create the compose file:**

Adjust the volume mounts under `volumes:` to match your actual media paths.

```bash
cat > ~/docker/jellyfin/docker-compose.yml << 'EOF'
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    restart: unless-stopped
    network_mode: host
    group_add:
      - render
      - video
    devices:
      - /dev/dri:/dev/dri
    volumes:
      - jellyfin_config:/config
      - jellyfin_cache:/cache
      # Adjust these paths to match your media locations:
      - /mnt/media/Movies:/data/movies
      - /mnt/media/TV:/data/tv
      - /mnt/media/Music:/data/music
      - /mnt/media/Books:/data/books

volumes:
  jellyfin_config:
  jellyfin_cache:
EOF
```

If you do not have an AMD GPU, remove the `group_add` and `devices` sections.

**4. Start Jellyfin:**
```bash
cd ~/docker/jellyfin
docker compose up -d
```

**5. Wait 15–30 seconds for Jellyfin to initialize, then verify it is running:**
```bash
docker ps --filter name=jellyfin
curl -s -o /dev/null -w "%{http_code}" http://localhost:8096
# Expected: 200
```

## Post-install configuration

Open `http://localhost:8096` and complete the setup wizard:

1. Choose your language
2. Create an admin account
3. Add media libraries — point them to the container paths:
   - Movies → `/data/movies`
   - TV Shows → `/data/tv`
   - Music → `/data/music`
   - Books → `/data/books`
4. Finish and let the initial metadata scan run

### Enable AMD VAAPI hardware transcoding

1. Go to **Dashboard → Playback → Transcoding**
2. Hardware Acceleration: `Video Acceleration API (VAAPI)`
3. VA-API Device: `/dev/dri/renderD128`
4. Enable codecs: H.264, H.265/HEVC, AV1 (check what your GPU supports)
5. Save

Verify it works: play a video and check **Dashboard → Active Devices** — it should show the codec with `(hw)` suffix.

## Verification

- Open `http://localhost:8096` — Jellyfin web UI loads
- Browse to a library and confirm metadata and cover art appeared
- Play a video and confirm it streams without errors
- (AMD only) Check **Dashboard → Active Devices** for `(hw)` transcoding indicator

## Common issues

**Problem:** `docker compose up` fails with `device /dev/dri not found`
**Fix:** Your system does not have `/dev/dri` exposed (no GPU or driver not loaded). Remove the `devices` section from the compose file to run without hardware transcoding.

**Problem:** Hardware transcoding shows as software in active devices
**Fix:** Verify the user is in the `render` and `video` groups: `groups`. If added recently, log out and back in. Check that the VAAPI device path is correct: `ls /dev/dri/` — the device is usually `renderD128`.

**Problem:** Library shows "No items" after scan
**Fix:** Confirm the container volume paths match where your files actually are. Check Jellyfin logs: `docker compose -f ~/docker/jellyfin/docker-compose.yml logs -f`.

**Problem:** Port 8096 already in use
**Fix:** Change `network_mode: host` to a port mapping: add `ports: - "8097:8096"` and remove `network_mode: host`.

## Useful commands
```bash
cd ~/docker/jellyfin
docker compose logs -f               # view logs
docker compose pull && docker compose up -d   # update
docker compose down                  # stop
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
