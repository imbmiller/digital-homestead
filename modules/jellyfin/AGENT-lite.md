# Jellyfin — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Confirm Docker is installed:
```
docker --version
```

Know where your media is stored. Common locations: `/mnt/media/Movies`, `/mnt/media/TV`.

---

## Part 1 — Set up GPU access (AMD only)

**Skip this part entirely if you do not have an AMD GPU.**

If the user has an AMD GPU (Radeon), do these two steps.

**Step 1 — Add your user to required groups:**
```
sudo usermod -aG render,video $USER
```

**Step 2 — Verify the groups were added:**
```
groups $USER
```

Expected: `render` and `video` appear in the output. If not, stop and report.

The group change takes effect after the user logs out and back in. Note this for the user but continue — Docker will apply the group for the container.

---

## Part 2 — Create files

**Step 3 — Create the directory:**
```
mkdir -p ~/docker/jellyfin
```

**Step 4 — Copy the compose file from the repo:**
```
cp ~/digital-homestead/modules/jellyfin/docker-compose.yml ~/docker/jellyfin/docker-compose.yml
```

**Step 5 — Edit the compose file to set correct media paths.**

Open the file:
```
nano ~/docker/jellyfin/docker-compose.yml
```

Find the `volumes:` section. It looks like this:
```
- /mnt/media/Movies:/data/movies
- /mnt/media/TV:/data/tv
```

Change the left side of each line (before the `:`) to match where the user's media actually is. Do not change the right side.

**If the user does not have an AMD GPU:** also remove the `group_add:` and `devices:` sections from the file.

Save and close (Ctrl+X, Y, Enter in nano).

---

## Part 3 — Start Jellyfin

**Step 6 — Start the container:**
```
cd ~/docker/jellyfin
```

```
docker compose up -d
```

Wait for it to finish.

**Step 7 — Wait for Jellyfin to initialize:**
```
sleep 20
```

**Check — Confirm it is running:**
```
docker ps --filter name=jellyfin
```

Expected: a row showing `jellyfin` with status `Up`.

**Check — Confirm the web UI responds:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:8096
```

Expected: `200`. If you get anything else, check the logs:
```
docker logs jellyfin
```

---

## Part 4 — Setup wizard (browser steps)

Tell the user to open `http://localhost:8096` and:

1. Choose language, click Next
2. Create an admin account
3. Add media libraries pointing to the container paths:
   - `/data/movies` for Movies
   - `/data/tv` for TV Shows
   - `/data/music` for Music
4. Finish the wizard

**AMD GPU only — after wizard:**
Tell the user to go to Dashboard → Playback → Transcoding and:
- Set Hardware Acceleration to `VAAPI`
- Set VA-API Device to `/dev/dri/renderD128`
- Enable H.264 and H.265 codecs
- Save

Wait for the user to confirm setup is complete.

---

## Done

Jellyfin is installed. It will start automatically when Docker starts. If any step failed, open a feedback issue with the step number and error message.
