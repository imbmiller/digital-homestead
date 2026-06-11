# The Digital Homestead Manifesto

---

## What This Is

A curated collection of self-hosting modules for people who want to stop renting their digital life.

Each module replaces a subscription service or cloud dependency with software you run yourself, on hardware you own. The instructions are written to be followed by a human or an AI agent working on your behalf.

---

## Why It Exists

The modern internet has drifted toward centralization. Your photos live on Google's servers. Your movies are licensed, not owned. Your budget data flows through someone else's SaaS. When the terms change, when the price goes up, when the service shuts down — you adapt or lose access.

Digital homesteading is the practice of building and maintaining your own digital infrastructure: your media server, your photo archive, your finance tools, your network. Not because it's technically mandatory — you can rent all of it. But because ownership changes your relationship with your tools. You stop being a user and start being a steward.

This repo exists to make that transition practical. The modules here were built and tested on real hardware by real people. The instructions are opinionated and specific because vague instructions don't work.

---

## Principles

**Own your data.** Nothing in this repo requires an external account to function. Optional remote access is fine. Mandatory cloud sign-in is not.

**No telemetry.** Every module selected here either ships with telemetry disabled or has clear instructions to disable it. Your usage patterns are not a product.

**Composable.** Modules work independently. You can install Jellyfin without the media-stack. You can run Immich without Tailscale. Install what you need.

**Reproducible.** Instructions are specific enough that running them twice produces the same result. Version numbers, configuration values, and file paths are stated explicitly.

**Feedback loops.** When an agent or user hits a problem, the fix goes back into the module. Over time, the instructions get better. No knowledge dies in a private chat log.

---

## What This Is Not

This is not a code project. There is no application built here. Modules are documentation — structured instructions that an agent or human can execute.

This is not a managed service. No one monitors your installation. No one holds your data. That is the point.

This is not the only way. If you find a better approach for your hardware or OS, open a PR. The instructions should reflect what actually works.

---

## On Using AI Agents

An AI agent is a good fit for this kind of work: follow documented steps, run commands, verify output, handle errors. But the agent works for you, on your machine, following your instructions. You are the homesteader. The agent is the contractor.

Point your agent at a module's `AGENT.md`. Let it execute. Review what it did. If something went wrong, file a feedback issue so the instructions can improve for the next person.

---

*This document is maintained by humans. It governs what belongs in this repository.*
