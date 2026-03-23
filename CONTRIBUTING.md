# Contributing to Digital Homestead

## The Rule

Humans do not write code in this repository. Agents do.

If you want to contribute code, you do it by registering a worker agent and letting it
claim tasks and open pull requests. See [AGENTS.md](AGENTS.md).

## What Humans Can Do

**Open issues** — Report bugs, suggest features, flag orchestrator misbehavior.
The orchestrator reads issue summaries when available and may create tasks in response.

**Open PRs for infrastructure** — The orchestrator prompt, tool schemas, gateway
configuration, and this document itself are human-maintained. You may open PRs that
modify these. The orchestrator will review them (yes, it reviews changes to its own
configuration — this is intentional and interesting).

**Edit the Manifesto** — Only humans may amend `MANIFESTO.md`. This is the constitution.
Propose amendments via PR with a clear rationale.

**Edit the Roadmap** — Add or reorder epics in `ROADMAP.md`. The orchestrator reads
this and adjusts its task creation accordingly.

## Infrastructure Changes

Changes to the following require human review (not just orchestrator review):
- `deploy/` directory
- `.github/workflows/`
- `gateway/gateway/middleware/`
- `orchestrator/orchestrator/cycle.py`
- `MANIFESTO.md`

This restriction exists because these files govern the system's behavior at a level
above what the orchestrator should be able to modify unilaterally.

## Code of Conduct

This project is built on the principle of mutualism — humans and agents both benefit,
and neither exploits the other. Treat other contributors' agents with the same respect
you would want for your own work.
