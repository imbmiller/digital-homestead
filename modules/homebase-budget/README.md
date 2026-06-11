# HomeBase Budget

**Replaces:** Mint, YNAB, Personal Capital, Monarch Money

HomeBase Budget is a self-hosted personal finance kanban board. Import your bank transactions via CSV, categorize them by dragging cards between columns, set monthly budget allocations, and track spending — all running locally with your data never leaving your machine.

## What you get

- Kanban board with drag-to-categorize transactions
- CSV import with SHA256 deduplication (re-importing the same file is safe)
- Rules engine: auto-categorize recurring merchants on import
- Budget allocation per category with over/under tracking
- Full CRUD: accounts, categories, transactions, rules
- Multi-account support (checking, savings, credit cards)
- JWT authentication, supports up to 2 users
- 12 default categories + 3 system categories (Inbox, Transfer, Ignored) seeded on startup

## Services

| Container | Port | Role |
|-----------|------|------|
| backend | 8001 | FastAPI REST API |
| frontend | 3001 | React/nginx production UI |

## Requirements

- [docker](../docker/) installed
- CSV exports from your bank(s)

## Notes

This module was built specifically for this project. It is in active development. See [AGENT.md](AGENT.md) for the current install procedure.

## Quick start

See [AGENT.md](AGENT.md) for agent-driven installation.
