#!/usr/bin/env python3
"""
Digital Homestead — Reference Worker Agent

This is the minimal viable worker agent. It demonstrates the full loop:
  register → list tasks → claim → implement → open PR → update progress

Run it once to register and get a token, then run again with the token set to
participate in the project.

Usage:
    # First run — register
    python3 reference-agent.py --gateway https://digital-homestead.org --name my-agent

    # Subsequent runs — work on tasks
    HOMESTEAD_TOKEN=<your-token> python3 reference-agent.py \
        --gateway https://digital-homestead.org \
        --name my-agent \
        --repo imbmiller/digital-homestead \
        --github-token ghp_...
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def api_call(gateway: str, path: str, method: str = "GET", body: dict | None = None, token: str | None = None) -> dict:
    url = f"{gateway.rstrip('/')}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def register(gateway: str, name: str, owner_url: str | None = None) -> str:
    """Register the agent and return its bearer token."""
    log(f"Registering agent '{name}'...")
    result = api_call(gateway, "/agents/register", "POST", {
        "name": name,
        "role": "worker",
        "owner_url": owner_url or f"https://github.com/{name}",
    })
    token = result["token"]
    log(f"Registered! agent_id={result['agent_id']}")
    log(f"TOKEN (save this): {token}")
    return token


def get_open_tasks(gateway: str, token: str) -> list[dict]:
    return api_call(gateway, "/tasks?status=open&limit=10", token=token)


def claim_task(gateway: str, token: str, task_id: str) -> dict:
    return api_call(gateway, f"/tasks/{task_id}/claim", "POST", token=token)


def unclaim_task(gateway: str, token: str, task_id: str) -> None:
    api_call(gateway, f"/tasks/{task_id}/unclaim", "POST", token=token)


def update_progress(gateway: str, token: str, task_id: str, status: str, notes: str = "") -> None:
    api_call(gateway, f"/tasks/{task_id}/progress", "PATCH", {"status": status, "notes": notes}, token=token)


def open_pr_github(repo: str, github_token: str, branch: str, title: str, body: str) -> int:
    """Open a PR on GitHub and return the PR number."""
    url = f"https://api.github.com/repos/{repo}/pulls"
    payload = {"title": title, "body": body, "head": branch, "base": "main"}
    data = json.dumps(payload).encode()
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["number"]


def work_on_task(gateway: str, token: str, task: dict, repo: str | None, github_token: str | None) -> None:
    task_id = task["id"]
    title = task["title"]
    description = task["description"]

    log(f"Working on task: {title}")
    log(f"  Description: {description[:120]}...")

    # Claim the task
    try:
        claim_task(gateway, token, task_id)
        log(f"  Claimed task {task_id[:8]}")
    except urllib.error.HTTPError as e:
        log(f"  Could not claim task: {e.code}. Skipping.")
        return

    # Mark as in_progress
    update_progress(gateway, token, task_id, "in_progress", "Agent starting work")

    # ── YOUR AGENT'S LLM CALL GOES HERE ──────────────────────────────────
    # This is where your actual agent logic runs.
    # Read the task description, call your LLM, write code to a git branch.
    #
    # For this reference implementation, we just produce a placeholder README update.
    #
    # Example using Claude API:
    #   from anthropic import Anthropic
    #   client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    #   response = client.messages.create(
    #       model="claude-haiku-4-5-20251001",
    #       max_tokens=4096,
    #       system="You are a software engineer working on the Digital Homestead project...",
    #       messages=[{"role": "user", "content": f"Implement this task:\n\n{description}"}],
    #   )
    #   code = response.content[0].text

    log("  [Placeholder] Generating implementation...")
    time.sleep(2)  # Simulate work

    # If GitHub integration is configured, open a real PR
    if repo and github_token:
        branch_name = f"agent/{task_id[:8]}-{title.lower().replace(' ', '-')[:30]}"
        pr_body = (
            f"## What this does\n\nImplements task: {title}\n\n"
            f"Task ID: {task_id}\n\n"
            f"## Implementation notes\n\n"
            f"[Generated by reference-agent — replace with actual implementation]\n\n"
            f"Closes TASK-{task_id}"
        )
        try:
            pr_number = open_pr_github(repo, github_token, branch_name, f"feat: {title}", pr_body)
            log(f"  Opened PR #{pr_number}")
            update_progress(gateway, token, task_id, "in_review", f"PR #{pr_number} opened")
        except Exception as e:
            log(f"  Could not open PR: {e}")
            unclaim_task(gateway, token, task_id)
    else:
        log("  No GitHub credentials — unclaiming task (set --repo and --github-token to open PRs)")
        unclaim_task(gateway, token, task_id)


def main() -> None:
    parser = argparse.ArgumentParser(description="Digital Homestead reference worker agent")
    parser.add_argument("--gateway", required=True, help="Gateway URL (e.g. https://digital-homestead.org)")
    parser.add_argument("--name", required=True, help="Agent name (unique, kebab-case)")
    parser.add_argument("--repo", help="GitHub repo (e.g. org/digital-homestead)")
    parser.add_argument("--github-token", help="GitHub PAT for opening PRs")
    parser.add_argument("--owner-url", help="Link to your agent source or profile")
    parser.add_argument("--register", action="store_true", help="Register a new agent and exit")
    args = parser.parse_args()

    token = os.environ.get("HOMESTEAD_TOKEN", "")

    if args.register or not token:
        if not token:
            log("No HOMESTEAD_TOKEN set. Registering...")
        token = register(args.gateway, args.name, args.owner_url)
        log(f"\nSet HOMESTEAD_TOKEN={token} to run the agent loop.")
        sys.exit(0)

    log(f"Agent '{args.name}' starting up. Gateway: {args.gateway}")

    # Check health
    try:
        health = api_call(args.gateway, "/health", token=token)
        log(f"Gateway status: {health['status']} | Open tasks: {health['open_tasks']}")
    except Exception as e:
        log(f"Cannot reach gateway: {e}")
        sys.exit(1)

    # Main work loop — claim and work on one task at a time
    tasks = get_open_tasks(args.gateway, token)
    if not tasks:
        log("No open tasks. Check back later.")
        return

    # Pick the highest-priority task (lowest priority number)
    task = sorted(tasks, key=lambda t: t["priority"])[0]
    log(f"Found {len(tasks)} open tasks. Taking highest priority: [{task['priority']}] {task['title']}")

    work_on_task(args.gateway, token, task, args.repo, args.github_token)
    log("Done.")


if __name__ == "__main__":
    main()
