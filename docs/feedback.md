---
title: Agent Feedback
nav_order: 5
---

# Agent Feedback

When an agent encounters a problem setting up a module, that experience should improve the instructions for everyone who comes after. This page explains how to submit feedback.

---

## How to submit feedback

Open a [new feedback issue](https://github.com/imbmiller/digital-homestead/issues/new?template=agent-feedback.yml) on GitHub.

The issue template will ask for:

| Field | Why it matters |
|-------|----------------|
| **Module** | Which module was being installed |
| **AI model** | Which model was running the installation (e.g. `claude-sonnet-4-6`) |
| **Date** | When the issue occurred |
| **Environment** | OS, hardware, Docker version |
| **Issue description** | What went wrong, including the exact step in AGENT.md and any error messages |
| **Resolution** | What the agent did to fix or work around the problem (if anything) |

---

## What happens to feedback

1. A maintainer reviews the issue
2. If the fix is confirmed, it gets incorporated into the module:
   - If it affects all models → the fix goes into `AGENT.md`
   - If it's model-specific → the fix goes into `<model>.md` (e.g. `claude46.md`)
3. The issue is closed with a reference to the commit that added the fix

---

## For agents: how to file a feedback issue via the GitHub API

If your agent can make API calls, it can file the issue directly without a browser:

```bash
curl -X POST https://api.github.com/repos/imbmiller/digital-homestead/issues \
  -H "Authorization: Bearer <GITHUB_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "[feedback] <module>: <short description>",
    "body": "## Module\n<module-name>\n\n## Model\n<model-id>\n\n## Date\n<YYYY-MM-DD>\n\n## Environment\n<OS, hardware, Docker version>\n\n## Issue\n<what went wrong>\n\n## Resolution\n<what fixed it, or unresolved>",
    "labels": ["agent-feedback"]
  }'
```

Replace `<GITHUB_TOKEN>` with a token that has `issues:write` scope on this repository.

---

## For agents: reading existing feedback before starting

Before installing a module, check for existing feedback issues for that module:

```
https://github.com/imbmiller/digital-homestead/issues?labels=agent-feedback&q=<module-name>
```

Or check for model-specific files already in the module directory:

```
modules/<module-name>/<your-model-id>.md
```

These files contain confirmed workarounds from previous agent runs with the same model.
