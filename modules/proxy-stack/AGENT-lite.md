# Proxy Stack — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.
> This module has two parts: AdGuard Home (DNS) and Nginx Proxy Manager (reverse proxy).
> Do them in order. Do not skip steps.

---

## Before you start

Confirm Docker is installed:
```
docker --version
```

Get this machine's Tailscale IP (you will need it later):
```
tailscale ip
```

Write down the result. It looks like `100.x.x.x`.

---

## Part 1 — Create files

**Step 1 — Create the directory:**
```
mkdir -p ~/docker/proxy-stack
```

**Step 2 — Copy the compose file from the repo:**
```
cp ~/digital-homestead/modules/proxy-stack/docker-compose.yml ~/docker/proxy-stack/docker-compose.yml
```

**Check:** Confirm the file exists:
```
ls ~/docker/proxy-stack/
```

Expected: `docker-compose.yml`

---

## Part 2 — Fix port 53 conflict

Port 53 (DNS) is held by systemd-resolved by default. We need to release it.

**Step 3 — Disable the stub listener:**
```
sudo sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf
```

**Step 4 — Restart resolved:**
```
sudo systemctl restart systemd-resolved
```

**Check:** Confirm port 53 is now free:
```
sudo ss -tulnp | grep :53
```

Expected: no output (or only non-stub entries). If `systemd-resolve` still shows on port 53, stop and report the error.

---

## Part 3 — Lock DNS configuration

**Step 5 — Tell NetworkManager not to manage DNS:**
```
sudo mkdir -p /etc/NetworkManager/conf.d
```

```
sudo tee /etc/NetworkManager/conf.d/dns-none.conf > /dev/null << 'EOF'
[main]
dns=none
EOF
```

**Step 6 — Unlock resolv.conf if it is immutable:**
```
sudo chattr -i /etc/resolv.conf
```

It is OK if this says "Operation not supported" — continue.

**Step 7 — Write new resolv.conf:**
```
sudo tee /etc/resolv.conf > /dev/null << 'EOF'
nameserver 127.0.0.1
nameserver 1.1.1.1
options timeout:1 attempts:1
EOF
```

**Step 8 — Lock it so it cannot be overwritten:**
```
sudo chattr +i /etc/resolv.conf
```

---

## Part 4 — Start the stack

**Step 9 — Start the containers:**
```
cd ~/docker/proxy-stack
```

```
docker compose up -d
```

Wait for it to finish.

**Check:** Confirm both containers are running:
```
docker ps --filter name=npm --filter name=adguard
```

Expected: two rows showing `npm` and `adguard` with status `Up`.

If either shows `Exited`, check its logs:
```
docker logs npm
```
or
```
docker logs adguard
```

---

## Part 5 — Configure AdGuard Home (browser steps)

Tell the user to do the following in their browser:

1. Open `http://localhost:3000`
2. Click through the setup wizard (Get Started → Next → Next)
3. On the Admin Web Interface page, change port from `80` to `3000`
4. Set a username and password — write these down
5. Finish the wizard
6. Go to Filters → DNS Rewrites → Add a rewrite:
   - Domain: `*.home`
   - IP: the Tailscale IP from earlier (e.g. `100.x.x.x`)
7. Go to Settings → DNS Settings → set Upstream DNS to `1.1.1.1`

Wait for the user to confirm they have completed AdGuard setup.

---

## Part 6 — Configure Nginx Proxy Manager (browser steps)

Tell the user to do the following in their browser:

1. Open `http://localhost:81`
2. Log in with email `admin@example.com` and password `changeme`
3. Change the password immediately when prompted
4. For each service they want accessible by hostname, go to Proxy Hosts → Add Proxy Host:
   - Domain: `servicename.home` (e.g. `jellyfin.home`)
   - Forward Hostname: `host.docker.internal`
   - Forward Port: the service's port (e.g. `8096` for Jellyfin)

Wait for the user to confirm.

---

## Check — Test DNS resolution

Run:
```
nslookup jellyfin.home 127.0.0.1
```

Expected: it should return an IP address (the Tailscale IP you entered in AdGuard).

If it returns `NXDOMAIN` or a timeout, the AdGuard DNS rewrite was not saved correctly. Ask the user to check the Filters → DNS Rewrites page.

---

## Done

Proxy stack is running. `*.home` names now resolve on this machine. If any step failed, open a feedback issue with the step number and error message.
