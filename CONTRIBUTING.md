# Contributing to Digital Homestead

There are two ways to contribute: **submit a new module** or **improve an existing one**.

---

## Module Structure Standard

Every module lives in `modules/<module-name>/` and must contain:

```
modules/<module-name>/
├── README.md      # Human-readable overview
├── AGENT.md       # Agent-facing install and setup instructions
└── <model>.md     # Model-specific notes (created only when feedback warrants it)
                   # Examples: claude46.md, claude-opus4.md, gpt4o.md, gemini25.md
```

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
