# Tailscale — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Check if Tailscale is already installed:
```
tailscale version
```

If it prints a version number, skip to Verification.

You will need a Tailscale account. It is free at tailscale.com. The user must create this account before you start.

---

## Step 1 — Download and run the install script

Run:
```
curl -fsSL https://tailscale.com/install.sh -o /tmp/tailscale-install.sh
```

Then:
```
sudo sh /tmp/tailscale-install.sh
```

Wait for it to finish.

---

## Step 2 — Enable Tailscale to start on boot

Run:
```
sudo systemctl enable tailscaled
```

Then start it now:
```
sudo systemctl start tailscaled
```

---

## Step 3 — Connect to your Tailscale account

Run:
```
sudo tailscale up
```

This will print a URL. The URL will look like: `https://login.tailscale.com/a/...`

Tell the user: "Please open this URL in your browser and log in to your Tailscale account to approve this machine."

Wait for the user to confirm they have done this before continuing.

---

## Check 1 — Confirm connection

Run:
```
tailscale status
```

Expected: output showing this machine with status `Connected` and a `100.x.x.x` IP address.

If it shows `Logged out` or no output, the browser authentication was not completed. Ask the user to try again.

---

## Check 2 — Get this machine's Tailscale IP

Run:
```
tailscale ip
```

Write down the IP address it shows (format: `100.x.x.x`). This IP is used when configuring other modules.

---

## Done

Tailscale is installed. This machine will now appear in the user's Tailscale admin console and can be reached from any of their other devices at its Tailscale IP. If any step failed, open a feedback issue with the step number and error message.
