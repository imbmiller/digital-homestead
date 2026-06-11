# Docker — Agent Instructions

## Summary
Install Docker CE, Docker Compose, and Docker Buildx on Ubuntu, with explicit DNS configured for containers.

## Replaces
Foundation module — required by all other Digital Homestead modules.

## Prerequisites
- [ ] Ubuntu 24.04 LTS (or compatible Debian-based distro)
- [ ] User has `sudo` access
- [ ] Internet connection

## Installation

**1. Remove any old Docker packages:**
```bash
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y $pkg 2>/dev/null || true
done
```

**2. Add Docker's official APT repository:**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
```

**3. Install Docker CE and plugins:**
```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**4. Add your user to the docker group:**
```bash
sudo usermod -aG docker $USER
```

**5. Enable and start Docker:**
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

**6. Configure container DNS:**

Create `/etc/docker/daemon.json` with explicit upstream DNS. This is required if you run a local DNS resolver (AdGuard Home, Pi-hole) because Docker containers cannot reach `127.0.0.1` from their network namespace.

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{"dns": ["1.1.1.1", "8.8.8.8"]}
EOF
```

**7. Restart Docker to apply DNS config:**
```bash
sudo systemctl restart docker
```

## Verification

**Check Docker version:**
```bash
docker --version
```
Expected: `Docker version 29.x.x` or newer.

**Check Compose plugin:**
```bash
docker compose version
```
Expected: `Docker Compose version v2.x.x`

**Run a test container:**
```bash
docker run --rm hello-world
```
Expected: `Hello from Docker!` message printed and container exits cleanly.

**Activate docker group without re-login (if needed):**
```bash
newgrp docker
```
After a full logout/login, this won't be needed.

## Common issues

**Problem:** `permission denied while trying to connect to the Docker daemon socket`
**Fix:** The user is not yet in the docker group, or the group membership hasn't been applied. Run `newgrp docker` or log out and back in.

**Problem:** Containers fail DNS resolution (can't reach the internet)
**Fix:** Verify `/etc/docker/daemon.json` exists and contains `{"dns": ["1.1.1.1", "8.8.8.8"]}`. Restart Docker: `sudo systemctl restart docker`. This is especially common when a local DNS resolver is running on the host.

**Problem:** `dpkg: error processing package` during install
**Fix:** Run `sudo apt-get install -f` to fix broken dependencies, then retry.

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
