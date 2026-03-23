# PR Review Rubric

The orchestrator reviews every PR against five dimensions. Each is scored 0–20.
A PR must score 12+ on every dimension (60+ total) to be approved and merged.

---

## 1. Manifesto Alignment (0–20)

**Question:** Does this change serve the goals stated in the Manifesto?

| Score | Meaning |
|-------|---------|
| 20 | Directly advances a stated Phase 1 goal |
| 15 | Supports a Phase 1 goal indirectly or improves the process |
| 12 | Neutral — doesn't help or hurt Manifesto goals |
| 8 | Tangentially related but not clearly aligned |
| 0 | Contradicts the Manifesto (adds cloud dependency, telemetry, etc.) |

**Auto-fail conditions:** Adding telemetry, analytics, or tracking of any kind will score 0 regardless of other merits. A score of 0 means the PR is rejected even if it scores 20 on all other dimensions.

---

## 2. Simplicity (0–20)

**Question:** Can this run on a Raspberry Pi 4 (4GB RAM, ARM64, no GPU)?

| Score | Meaning |
|-------|---------|
| 20 | Designed for minimal resources; single process; no new deps |
| 15 | Adds a small, justified dependency; still Raspberry Pi compatible |
| 12 | Slightly heavy but workable on the target hardware |
| 8 | Requires a cloud service or resource-heavy dependency |
| 0 | Requires Kubernetes, GPUs, or cloud-mandatory infrastructure |

---

## 3. Security (0–20)

**Question:** Does this introduce security risks?

| Score | Meaning |
|-------|---------|
| 20 | No new attack surface; secrets handled correctly; no telemetry |
| 15 | Minor low-risk additions with appropriate safeguards |
| 12 | Acceptable security posture with no obvious vulnerabilities |
| 8 | Opens a port without proper auth, or handles secrets poorly |
| 0 | Default passwords, no authentication on exposed service, phones home |

**Auto-fail conditions:** Any PR that opens a port with a default password, stores credentials in plaintext, or sends data to external servers without explicit user opt-in scores 0.

---

## 4. Code Quality (0–20)

**Question:** Is this readable, tested, and documented?

| Score | Meaning |
|-------|---------|
| 20 | Clean code, good test coverage, docs a non-developer can follow |
| 15 | Mostly clean; tests present; basic docs |
| 12 | Functional code; minimal tests or docs but not absent |
| 8 | Works but hard to understand; no tests; no docs |
| 0 | Broken, untested, or completely undocumented |

---

## 5. Task Scope (0–20)

**Question:** Does the PR match the task it claims to implement?

| Score | Meaning |
|-------|---------|
| 20 | Precisely implements the task; nothing more, nothing less |
| 15 | Implements the task with minor, sensible additions |
| 12 | Mostly on-scope with small deviations |
| 8 | Significant scope creep or major parts of the task missing |
| 0 | No relationship to the claimed task, or rewrites unrelated code |

---

## Scoring Examples

| Total | Verdict |
|-------|---------|
| 95–100 | Excellent — merge with praise |
| 80–94 | Good — merge with minor feedback |
| 60–79 | Acceptable — merge or request small changes |
| 40–59 | Needs work — request changes |
| 0–39 | Reject — fundamental issues to address |

Any dimension scoring 0 (auto-fail) → reject, regardless of total.
Any dimension scoring below 12 → request changes, regardless of total.
