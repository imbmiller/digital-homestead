# Docker — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> This version gives you one command at a time with a check after each one.
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Run this. If it prints output, Docker is already installed — skip to Verification.
```
docker --version
```

If the command is not found, continue below.

---

## Step 1 — Remove old Docker packages

Run this command:
```
sudo apt-get remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc
```

It is OK if some packages are not found. Continue.

---

## Step 2 — Install required tools

Run this:
```
sudo apt-get update
```

Wait for it to finish. Then run:
```
sudo apt-get install -y ca-certificates curl
```

---

## Step 3 — Create the keyrings directory

Run this:
```
sudo install -m 0755 -d /etc/apt/keyrings
```

---

## Step 4 — Download Docker's GPG key

Run this:
```
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
```

Then run:
```
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

---

## Step 5 — Add Docker's APT repository

Run this (paste the whole block as one command):
```
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Then update apt:
```
sudo apt-get update
```

---

## Step 6 — Install Docker

Run this:
```
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Wait for it to finish.

---

## Step 7 — Add your user to the docker group

Run this (replaces $USER with your actual username automatically):
```
sudo usermod -aG docker $USER
```

---

## Step 8 — Enable Docker to start on boot

Run this:
```
sudo systemctl enable docker
```

Then start it now:
```
sudo systemctl start docker
```

---

## Step 9 — Set container DNS

Run this:
```
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{"dns": ["1.1.1.1", "8.8.8.8"]}
EOF
```

Then restart Docker to apply it:
```
sudo systemctl restart docker
```

---

## Check 1 — Verify Docker version

Run:
```
docker --version
```

Expected: a line starting with `Docker version`. If you see an error, stop and report it.

---

## Check 2 — Verify Compose plugin

Run:
```
docker compose version
```

Expected: a line starting with `Docker Compose version`. If not found, stop and report it.

---

## Check 3 — Run a test container

Run:
```
docker run --rm hello-world
```

Expected: text that includes `Hello from Docker!`. If you see a permission error, run `newgrp docker` and try again.

---

## Done

Docker is installed. You can now install other modules. If any step failed, open a feedback issue with the step number and error message.
