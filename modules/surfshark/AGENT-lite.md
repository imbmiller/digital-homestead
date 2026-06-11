# Surfshark — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

The user must have an active Surfshark subscription.

Check if Surfshark is already installed:
```
surfshark-vpn version
```

If it prints a version number, skip to Verification.

---

## Step 1 — Download and run the install script

Run:
```
curl -f https://downloads.surfshark.com/linux/debian-install.sh -o /tmp/surfshark-install.sh
```

Then:
```
sudo sh /tmp/surfshark-install.sh
```

Wait for it to finish.

---

## Step 2 — Install Surfshark

Run:
```
sudo apt-get install -y surfshark
```

Wait for it to finish.

---

## Step 3 — Create an auto-update script

Surfshark does not update automatically. Run this to create an update script:
```
sudo tee /usr/local/bin/surfshark-update.sh > /dev/null << 'EOF'
#!/bin/bash
apt-get update -qq && apt-get install -y --only-upgrade surfshark >> /var/log/surfshark-update.log 2>&1
EOF
```

Make it executable:
```
sudo chmod +x /usr/local/bin/surfshark-update.sh
```

---

## Step 4 — Schedule weekly auto-updates

Run:
```
sudo tee /etc/cron.d/surfshark-update > /dev/null << 'EOF'
30 7 * * * root /usr/local/bin/surfshark-update.sh
EOF
```

---

## Step 5 — Log in to Surfshark

Run:
```
surfshark-vpn login
```

This opens a browser-based login. Tell the user: "Please log in with your Surfshark credentials in the browser window that opened."

Wait for the user to confirm they have logged in before continuing.

---

## Step 6 — Connect to VPN

Run:
```
surfshark-vpn up
```

Wait a few seconds for the connection to establish.

---

## Check 1 — Verify VPN is working

Run:
```
curl -s https://api.ipify.org
```

The IP address it shows should NOT be your home IP. It should be a Surfshark server IP. If it shows your home IP, the VPN is not connected — check `surfshark-vpn status`.

---

## IMPORTANT — Kill switch warning

If you are also running Tailscale, do NOT enable the Surfshark kill switch. It will break Tailscale.

Run this to confirm the kill switch is off:
```
surfshark-vpn settings
```

If kill switch shows as enabled, disable it in the settings menu.

---

## Done

Surfshark is installed. The VPN is now connected. If any step failed, open a feedback issue with the step number and error message.
