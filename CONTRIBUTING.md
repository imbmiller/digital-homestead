# Contributing to Digital Homestead

There are two ways to contribute: **submit a new module** or **improve an existing one**.

---

## Module Structure Standard

Every module lives in `modules/<module-name>/` and must contain:

```
modules/<module-name>/
├── README.md          # Human-readable overview
├── AGENT.md           # Agent instructions — for capable models (100B+, hosted)
├── AGENT-lite.md      # Agent instructions — for local models under 100B parameters
├── docker-compose.yml # Ready-to-use compose file (if Docker-based)
├── .env.example       # Environment variable template (if applicable)
├── code/              # Full application source (for custom-coded modules only)
└── <model>.md         # Model-specific workarounds (added when feedback warrants it)
                       # Examples: claude46.md, claude-opus4.md, gpt4o.md, gemini25.md
```

Compose files and code are included directly in the module so agents can copy files from the repo rather than generating them from scratch. This reduces token use and the chance of generation errors.

### AGENT-lite.md standard

`AGENT-lite.md` is designed for local models under 100B parameters. Key requirements:

- **Assume the repo is cloned locally** — always reference files as `~/digital-homestead/modules/<name>/`
- **One command per numbered step** — no chaining with `&&`, no pipes
- **Copy files from the repo** — never ask the agent to generate config in a heredoc if the file is in the repo
- **Explicit pass/fail check after every major step** — "Run X. Expected: Y. If you see anything else, stop and report."
- **No inline conditionals** — separate optional sections (e.g. AMD GPU) into clearly labeled blocks the agent can decide to enter or skip
- **Plain language** — "Run this command. It does X." not "Configure the nginx reverse proxy..."

---

### README.md — required sections

```markdown
# <Module Name>

**Replaces:** <the SaaS / service this displaces>

One or two sentence description of what this is and what problem it solves.

## What you get

- Bullet list of capabilities

## Requirements

- Hardware minimums (RAM, disk)
- OS requirements
- Other modules that must be installed first

## Quick start

Link to AGENT.md for agent-driven install, or brief human steps.
```

---

### AGENT.md — required sections

This is the file your agent reads and executes. Write it as if you are giving instructions to a competent but context-free assistant.

```markdown
# <Module Name> — Agent Instructions

## Summary
One sentence: what this module installs and what it replaces.

## Replaces
The specific service(s) this displaces (e.g. Google Photos, Netflix).

## Prerequisites
- [ ] List required modules (e.g. `docker` must be installed)
- [ ] Hardware requirements
- [ ] Network requirements

## Installation

Step-by-step instructions. Number every step. Be explicit about:
- Exact commands to run
- Files to create and their full contents
- Configuration values and where to find user-specific ones
- Expected output for each step

## Verification

How to confirm the service is working correctly. Include:
- URL to visit and what to expect
- CLI command and expected output

## Common issues

Known problems with clear fixes. Format:

**Problem:** <description>
**Fix:** <exact steps>

## Model-specific notes

Check for model-specific files in this directory if you are hitting issues not covered above.
```

---

### Model-specific files (`<model>.md`)

These files are created automatically when agent feedback is incorporated. Do not create them manually unless you have confirmed a model-specific workaround.

Naming convention:
- `claude46.md` → Claude Sonnet 4.6
- `claude-opus4.md` → Claude Opus 4
- `gpt4o.md` → GPT-4o
- `gemini25.md` → Gemini 2.5

Each file should describe the specific problem, affected versions, and the exact workaround. Reference the GitHub issue that produced the feedback.

---

## Submitting a new module

1. Fork this repository
2. Create `modules/<your-module-name>/` with `README.md` and `AGENT.md`
3. Follow the structure standard above exactly
4. Open a PR against `main` using the new-module PR template
5. The PR description must include what service the module replaces and what hardware it was tested on

**A module will not be merged if:**
- It requires a cloud account to function (optional cloud features are fine)
- It ships telemetry that cannot be disabled
- The AGENT.md instructions are vague or untested
- It duplicates an existing module without meaningful improvement

---

## Improving an existing module

Open a PR with your changes. In the description, explain what problem you encountered and how the change fixes it. If it's a model-specific workaround, the change should go in `<model>.md`, not `AGENT.md`.

---

## Submitting feedback (not a code change)

If your agent ran into a problem, use the [agent feedback issue template](https://github.com/imbmiller/digital-homestead/issues/new?template=agent-feedback.yml) instead of a PR. Maintainers will incorporate confirmed fixes into the module files.
