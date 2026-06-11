# HomeBase Budget — Lite Agent Instructions
## For AI models under 100B parameters

> Use this file instead of AGENT.md if you are a smaller local model (under 100B parameters).
> The full application code is included in this repository under modules/homebase-budget/code/.
> Always work from a local clone of the digital-homestead repo.

---

## Before you start

Confirm Docker is installed:
```
docker --version
```

Confirm ports 8001 and 3001 are free:
```
sudo ss -tulnp | grep -E "8001|3001"
```

Expected: no output. If a port shows as in use, stop and tell the user which port is occupied.

---

## Part 1 — Copy the code

The application code is already in the repo. Copy it to a working directory.

**Step 1 — Copy the code:**
```
cp -r ~/digital-homestead/modules/homebase-budget/code ~/homebase-budget
```

**Check — Confirm the copy succeeded:**
```
ls ~/homebase-budget/
```

Expected: `backend`, `frontend`, `docker-compose.yml`, `.env.example`

---

## Part 2 — Configure the environment

**Step 2 — Create the env file:**
```
cp ~/homebase-budget/.env.example ~/homebase-budget/.env
```

**Step 3 — Generate a secret key:**
```
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output (a long string of letters and numbers).

**Step 4 — Set the secret key in the env file:**

Open the file:
```
nano ~/homebase-budget/.env
```

Find the line that starts with `SECRET_KEY=` and replace everything after the `=` with the string you copied in step 3.

Save and close (Ctrl+X, Y, Enter).

**Check — Confirm SECRET_KEY is set:**
```
grep SECRET_KEY ~/homebase-budget/.env
```

Expected: the line shows the secret you generated, not the original placeholder text.

---

## Part 3 — Create the data directory

**Step 5 — Create the data directory:**
```
mkdir -p ~/homebase-budget/data
```

---

## Part 4 — Start the application

**Step 6 — Build and start:**
```
cd ~/homebase-budget
```

```
docker compose up -d --build
```

This builds the Docker images. It may take 3–5 minutes the first time.

**Check — Both containers are running:**
```
docker compose ps
```

Expected: two rows — `homebase-backend` and `homebase-frontend` — both showing `Up`.

If either shows `Exited`, check logs:
```
docker compose logs
```

---

## Part 5 — First-time setup (browser steps)

Tell the user to do the following:

1. Open `http://localhost:3001`
2. The app will show a login page
3. To create the first account, open `http://localhost:8001/docs` in another tab
4. Find the `POST /auth/register` endpoint, click "Try it out", fill in a username and password, and click Execute
5. Go back to `http://localhost:3001` and log in

After login:
1. Go to Settings → Accounts → Add Account (add each bank account/credit card)
2. Go to Import and upload a CSV export from your bank
3. Transactions will appear in the Inbox column on the Board

Wait for user to confirm they can log in and see the Board.

---

## Final check

**Confirm the API is responding:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/docs
```

Expected: `200`

**Confirm the frontend is responding:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
```

Expected: `200`

---

## Done

HomeBase Budget is running. If any step failed, open a feedback issue with the step number and error message.
