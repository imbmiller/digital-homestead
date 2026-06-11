---
title: Contributing
nav_order: 4
---

# Contributing

There are two ways to contribute: **submit a new module** or **improve an existing one**.

---

## Module structure standard

Every module lives in `modules/<module-name>/` and must contain:

```
modules/<module-name>/
├── README.md      # Human-readable overview
├── AGENT.md       # Agent-facing install and setup instructions
└── <model>.md     # Model-specific notes (added when feedback is incorporated)
```

---

### README.md — required sections

| Section | Content |
|---------|---------|
| Title | Module name |
| **Replaces:** | The SaaS or service this displaces |
| Description | 1–2 sentences on what it is and what problem it solves |
| **What you get** | Bulleted list of capabilities |
| **Requirements** | Hardware, OS, other required modules |
| **Quick start** | Link to AGENT.md |

---

### AGENT.md — required sections

| Section | Content |
|---------|---------|
| **Summary** | One sentence: what this installs and what it replaces |
| **Replaces** | Specific service(s) displaced |
| **Prerequisites** | Checklist of required modules, hardware, accounts |
| **Installation** | Numbered, explicit steps with full commands |
| **Verification** | How to confirm it works (URL, CLI output) |
| **Common issues** | Known problems with exact fixes |
| **Model-specific notes** | Pointer to any `<model>.md` files present |

Write instructions as if giving them to a competent but context-free agent. Include exact commands, expected output, and file contents. Do not use relative paths or assume the reader knows your directory structure.

---

### Model-specific files (`<model>.md`)

Created when agent feedback reveals a model-specific workaround. Naming convention:

| File | Model |
|------|-------|
| `claude46.md` | Claude Sonnet 4.6 |
| `claude-opus4.md` | Claude Opus 4 |
| `gpt4o.md` | GPT-4o |
| `gemini25.md` | Gemini 2.5 Pro |

Each file should describe the problem, the affected model version, and the exact workaround. Reference the GitHub issue number that produced the feedback.

---

## Submitting a new module

1. Fork the repository
2. Create `modules/<your-module-name>/` with `README.md` and `AGENT.md`
3. Follow the structure standard above exactly
4. Open a PR against `main` using the new-module PR template
5. Include in the PR description: what service the module replaces and what hardware it was tested on

**A module will not be merged if:**
- It requires a cloud account for core functionality (optional cloud features are fine)
- It ships telemetry that cannot be disabled
- The AGENT.md steps are untested or vague
- It duplicates an existing module without meaningful improvement

---

## Improving an existing module

Open a PR with your changes. Explain in the description what problem you encountered and how the change addresses it.

If it's a model-specific workaround, the change goes in `<model>.md`, not `AGENT.md` — keep the main instructions model-agnostic.

---

## Reporting agent feedback (not a code change)

If your agent hit a problem during setup, use the [agent feedback issue](feedback.md) instead of a PR. Maintainers incorporate confirmed fixes into the module files.
