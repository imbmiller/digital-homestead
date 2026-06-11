# Portainer — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Run this. If it shows a portainer container, it is already installed — skip to Verification.
```
docker ps -a --filter name=portainer
```

Confirm Docker is installed:
```
docker --version
```

If Docker is not installed, do the docker module first.

---

## Step 1 — Create a volume for Portainer data

Run:
```
docker volume create portainer_data
```

Expected output: `portainer_data`

---

## Step 2 — Copy the compose file

Run this (adjust the path if your repo is cloned somewhere other than ~/digital-homestead):
```
mkdir -p ~/docker/portainer
```

Then:
```
cp ~/digital-homestead/modules/portainer/docker-compose.yml ~/docker/portainer/docker-compose.yml
```

---

## Step 3 — Start Portainer

Run:
```
cd ~/docker/portainer
```

Then:
```
docker compose up -d
```

Wait for it to finish.

---

## Check 1 — Confirm it is running

Run:
```
docker ps --filter name=portainer
```

Expected: a row showing `portainer` with status `Up`.

If the status shows `Exited` or is missing, stop and report the error from:
```
docker logs portainer
```

---

## Check 2 — Open the web UI

Open this URL in your browser: `https://localhost:9443`

You will see a browser warning about the certificate. This is expected. Click through it.

You should see the Portainer setup page.

**Important:** Create your admin account within 5 minutes. If you wait too long and the page shows a timeout error, run this and try again:
```
docker restart portainer
```

---

## Done

Portainer is installed. It will start automatically when Docker starts. If any step failed, open a feedback issue with the step number and error message.
