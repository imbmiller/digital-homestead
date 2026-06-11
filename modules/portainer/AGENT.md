# Portainer — Agent Instructions

## Summary
Deploy Portainer CE as a Docker container providing a web-based management UI for all other containers.

## Replaces
Manual `docker` CLI management, Rancher, Lens.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Port 9443 not in use

## Installation

**1. Create a Docker volume for Portainer's data:**
```bash
docker volume create portainer_data
```

**2. Run the Portainer container:**
```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

**3. Verify the container is running:**
```bash
docker ps --filter name=portainer
```

## Verification

Open `https://localhost:9443` in a browser. You will see a TLS certificate warning — accept the exception (this is expected; Portainer uses a self-signed cert).

**Important:** Create your admin account immediately. Portainer disables account creation after 5 minutes of first launch for security. If you miss the window, restart the container:
```bash
docker restart portainer
```

After creating the account, select **Docker Standalone** as the environment and click **Connect**.

## Common issues

**Problem:** "This instance has timed out for security purposes" on first visit
**Fix:** The 5-minute window expired. Restart the container with `docker restart portainer` and create the account immediately.

**Problem:** Cannot connect to Docker environment after login
**Fix:** Ensure `/var/run/docker.sock` is mounted correctly. Check with `docker inspect portainer | grep -A5 Mounts`.

**Problem:** Port 9443 already in use
**Fix:** Change the host port: replace `-p 9443:9443` with `-p 9444:9443` (or any free port) in the run command.

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
