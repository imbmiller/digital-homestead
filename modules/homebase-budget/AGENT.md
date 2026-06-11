# HomeBase Budget — Agent Instructions

## Summary
Deploy HomeBase Budget, a self-hosted personal finance kanban app for categorizing bank transactions and tracking monthly budgets.

## Replaces
Mint, YNAB, Personal Capital, Monarch Money.

## Prerequisites
- [ ] [docker](../docker/) module installed
- [ ] Ports 8001 and 3001 not in use (8000 and 3000 are commonly taken by other services)
- [ ] Git installed (to clone the repository)

## Installation

**1. Clone the repository:**
```bash
git clone https://github.com/imbmiller/homebase-budget.git ~/homebase-budget
cd ~/homebase-budget
```

**2. Create the environment file:**
```bash
cp .env.example .env
```

Edit `.env` and set:
- `SESSION_SECRET` — any random string of 16+ characters (used to sign JWT cookies)
- `ADMIN_DASHBOARD_EMAIL` — email for the first admin account
- `ADMIN_DASHBOARD_PASSWORD` — password for the first admin account

Example:
```bash
# Generate a random secret:
python3 -c "import secrets; print(secrets.token_hex(24))"
# Paste the output as SESSION_SECRET in .env
```

**3. Create the data directory:**
```bash
mkdir -p ~/homebase-budget/data
```

**4. Start the production stack:**
```bash
docker compose up -d
```

This starts the backend (port 8001) and frontend nginx server (port 3001).

**5. Verify both containers are running:**
```bash
docker compose ps
```
Both `homebase-backend` and `homebase-frontend` should be running.

## Post-install configuration

**1. Open the app:**
`http://localhost:3001`

**2. Create your first account:**
Go to **Settings → Add User** or POST to `http://localhost:8001/auth/register`.

**3. Add your bank accounts:**
Go to **Settings → Accounts → Add Account**. Add one entry per bank account or credit card.

**4. Import transactions:**
Go to **Import** and upload a CSV export from your bank. HomeBase detects common formats (Chase, Bank of America, generic). Transactions land in the **Inbox** column.

**5. Set budget allocations:**
Click any category column header on the Board to set a monthly dollar allocation.

**6. Categorize transactions:**
Drag transaction cards from Inbox to the appropriate category column.

## Verification

- `http://localhost:3001` loads the kanban board
- `http://localhost:8001/docs` shows the FastAPI Swagger UI (useful for debugging)
- Import a CSV — transactions appear in the Inbox column
- Drag a card to a category — it moves and stays after refresh

## Common issues

**Problem:** Frontend loads but API calls fail (network errors in browser console)
**Fix:** The backend is not running or the port is wrong. Check: `docker compose ps`. The frontend expects the backend at port 8001.

**Problem:** CSV import rejects the file with "unknown format"
**Fix:** HomeBase supports a subset of bank CSV formats. Open the CSV in a text editor and confirm it has a header row with columns like Date, Description, Amount. If the format is unusual, manually rename columns to match the expected format (see API docs at `/docs`).

**Problem:** `SESSION_SECRET` not set error on startup
**Fix:** `.env` file is missing or `SESSION_SECRET` is blank. Check: `cat ~/homebase-budget/.env | grep SESSION_SECRET`.

**Problem:** Port 3001 conflict (if 3000 is taken by AdGuard)
**Fix:** The default port is already set to 3001 to avoid conflicts with AdGuard Home on 3000. If 3001 is also in use, edit `docker-compose.yml` and change the host port mapping.

## Development mode (for making changes)

```bash
cd ~/homebase-budget
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# Frontend with HMR: http://localhost:5173
# Backend with auto-reload: http://localhost:8001
```

## Useful commands
```bash
cd ~/homebase-budget
docker compose ps
docker compose logs -f
docker compose up -d --build    # rebuild after code changes
docker compose down
```

## Model-specific notes

Check for model-specific files in this directory if you encounter issues not covered above.
