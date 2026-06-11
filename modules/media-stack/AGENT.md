# Media Stack — Agent Instructions

## Summary
Deploy an 8-container automated media stack: VPN-routed torrent client, indexer manager, and separate automations for TV, movies, music, and books, fronted by a request UI.

## Replaces
Manual torrent management, streaming services for content you can own.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] [jellyfin](../jellyfin/) module installed
- [ ] [surfshark](../surfshark/) module installed
- [ ] Surfshark WireGuard private key (Surfshark dashboard → Manual Setup → WireGuard → Generate Key)
- [ ] Media storage mounted at `/mnt/media` with subdirectories: `Movies/`, `TV/`, `Music/`, `Books/`, `Downloads/`
- [ ] Ports 5055, 7878, 8080, 8686, 8787, 8989, 9696 not in use

## Installation

**1. Create the stack directory:**
```bash
mkdir -p ~/docker/media-stack
```

**2. Create the `.env` file:**

Fill in your Surfshark WireGuard private key. Everything else can stay as-is for a default setup.

```bash
cat > ~/docker/media-stack/.env << 'EOF'
# Surfshark WireGuard — get from Surfshark dashboard → Manual Setup → WireGuard
VPN_SERVICE_PROVIDER=surfshark
VPN_TYPE=wireguard
WIREGUARD_PRIVATE_KEY=PASTE_YOUR_WIREGUARD_PRIVATE_KEY_HERE
SERVER_COUNTRIES=Netherlands

# User/group IDs — run `id` to confirm yours
PUID=1000
PGID=1000

# Media root
MEDIA_ROOT=/mnt/media
EOF
```

Run `id` to confirm your PUID/PGID values if you are not the default user.

**3. Create the compose file:**
```bash
cat > ~/docker/media-stack/docker-compose.yml << 'EOF'
services:
  gluetun:
    image: qmcgaw/gluetun:latest
    container_name: gluetun
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    ports:
      - "8080:8080"   # qBittorrent
    environment:
      - VPN_SERVICE_PROVIDER=${VPN_SERVICE_PROVIDER}
      - VPN_TYPE=${VPN_TYPE}
      - WIREGUARD_PRIVATE_KEY=${WIREGUARD_PRIVATE_KEY}
      - SERVER_COUNTRIES=${SERVER_COUNTRIES}

  qbittorrent:
    image: lscr.io/linuxserver/qbittorrent:latest
    container_name: qbittorrent
    restart: unless-stopped
    network_mode: "service:gluetun"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
      - WEBUI_PORT=8080
    volumes:
      - qbittorrent_config:/config
      - ${MEDIA_ROOT}/Downloads:/downloads

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    restart: unless-stopped
    ports:
      - "9696:9696"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
    volumes:
      - prowlarr_config:/config

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    restart: unless-stopped
    ports:
      - "8989:8989"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
    volumes:
      - sonarr_config:/config
      - ${MEDIA_ROOT}/TV:/tv
      - ${MEDIA_ROOT}/Downloads:/downloads

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    restart: unless-stopped
    ports:
      - "7878:7878"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
    volumes:
      - radarr_config:/config
      - ${MEDIA_ROOT}/Movies:/movies
      - ${MEDIA_ROOT}/Downloads:/downloads

  lidarr:
    image: lscr.io/linuxserver/lidarr:latest
    container_name: lidarr
    restart: unless-stopped
    ports:
      - "8686:8686"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
    volumes:
      - lidarr_config:/config
      - ${MEDIA_ROOT}/Music:/music
      - ${MEDIA_ROOT}/Downloads:/downloads

  readarr:
    image: lscr.io/linuxserver/readarr:develop
    container_name: readarr
    restart: unless-stopped
    ports:
      - "8787:8787"
    environment:
      - PUID=${PUID}
      - PGID=${PGID}
    volumes:
      - readarr_config:/config
      - ${MEDIA_ROOT}/Books:/books
      - ${MEDIA_ROOT}/Downloads:/downloads

  jellyseerr:
    image: fallenbagel/jellyseerr:latest
    container_name: jellyseerr
    restart: unless-stopped
    ports:
      - "5055:5055"
    volumes:
      - jellyseerr_config:/app/config

volumes:
  qbittorrent_config:
  prowlarr_config:
  sonarr_config:
  radarr_config:
  lidarr_config:
  readarr_config:
  jellyseerr_config:
EOF
```

**4. Verify your media directory structure exists:**
```bash
ls /mnt/media/
# Should show: Movies/ TV/ Music/ Books/ Downloads/
# Create any missing directories:
sudo mkdir -p /mnt/media/{Movies,TV,Music,Books,Downloads}
sudo chown -R $USER:$USER /mnt/media
```

**5. Start the stack:**
```bash
cd ~/docker/media-stack
docker compose up -d
```

**6. Verify the VPN is connected:**
```bash
docker compose logs gluetun | grep -i "VPN is up\|connected"
# Confirm qBittorrent is routing through VPN:
docker exec qbittorrent curl -s https://api.ipify.org
# Should return a Surfshark IP, not your ISP's IP
```

## Post-install configuration

### Connect Prowlarr to all *arr apps

Open `http://localhost:9696` (Prowlarr):
1. Go to **Settings → Apps**
2. Add each app: Sonarr (port 8989), Radarr (7878), Lidarr (8686), Readarr (8787)
3. Use the API keys from each app's Settings → General page
4. Go to **Indexers → Add Indexer** and add your torrent indexers

### Configure download client in each *arr app

In Sonarr, Radarr, Lidarr, Readarr (repeat for each):
1. Go to **Settings → Download Clients → Add**
2. Type: qBittorrent
3. Host: `gluetun`, Port: `8080` (qBittorrent runs in gluetun's network namespace)
4. Test and Save

### Set up Jellyseerr

Open `http://localhost:5055`:
1. Sign in with your Jellyfin account (use `http://jellyfin:8096` if on the same Docker network, or `http://localhost:8096`)
2. Connect Radarr and Sonarr under **Settings → Services**

## Verification

1. Open Jellyseerr at `http://localhost:5055`
2. Search for a movie and request it
3. Check Radarr at `http://localhost:7878` — the movie should appear under **Movies**
4. Check qBittorrent at `http://localhost:8080` — a download should start
5. After completion, the file should appear in `/mnt/media/Movies/`

## Common issues

**Problem:** gluetun fails to connect — `AUTH_FAILED` or `HANDSHAKE_TIMEOUT`
**Fix:** The WireGuard private key in `.env` is wrong or expired. Regenerate it in the Surfshark dashboard: Manual Setup → WireGuard → Generate new key. Update `.env` and restart: `docker compose restart gluetun`.

**Problem:** qBittorrent web UI shows no IP or wrong IP
**Fix:** gluetun is not fully connected yet. Wait 30 seconds and check `docker compose logs gluetun`. The *arr apps should not be configured until gluetun is confirmed up.

**Problem:** Sonarr/Radarr cannot reach qBittorrent
**Fix:** The download client host should be `gluetun` (not `localhost` or `qbittorrent`) because qBittorrent runs inside gluetun's network namespace.

**Problem:** Files download but don't appear in Jellyfin
**Fix:** Confirm the volume mounts match between media-stack and jellyfin. Both should use the same host paths (e.g. `/mnt/media/Movies`). Trigger a Jellyfin library scan: Dashboard → Libraries → scan.

## Useful commands
```bash
cd ~/docker/media-stack
docker compose ps                          # check all containers
docker compose logs -f gluetun            # VPN connection logs
docker compose logs -f qbittorrent        # torrent client logs
docker compose pull && docker compose up -d  # update all images
docker exec qbittorrent curl -s https://api.ipify.org  # verify VPN IP
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
