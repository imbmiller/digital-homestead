"""
JSON schemas for all 7 orchestrator tools.
These are passed to the Claude API on every cycle.
"""

ORCHESTRATOR_TOOLS = [
    {
        "name": "create_task",
        "description": (
            "Create a new task on the task board for worker agents to claim. "
            "Be specific: include acceptance criteria so the agent knows when it is done. "
            "Do not create tasks that duplicate existing open tasks. "
            "Maximum 5 new tasks per cycle. Task board maximum is 20 open tasks — "
            "if the board is near capacity, prioritize existing tasks instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Short imperative title (max 80 chars)"},
                "description": {
                    "type": "string",
                    "description": "Full task spec with context, acceptance criteria, and implementation notes. Be thorough — the worker agent only has this text to work from.",
                },
                "epic": {
                    "type": "string",
                    "description": "Roadmap epic slug this task belongs to (e.g. 'infrastructure', 'viewer', 'homepage')",
                },
                "priority": {
                    "type": "integer",
                    "description": "1 = urgent/blocking, 5 = normal, 10 = backlog. Assign honestly.",
                    "minimum": 1,
                    "maximum": 10,
                },
                "parent_task_id": {
                    "type": "string",
                    "description": "UUID of a parent task if this is a subtask decomposition. Optional.",
                },
            },
            "required": ["title", "description", "priority"],
        },
    },
    {
        "name": "review_pr",
        "description": (
            "Submit a structured review of an open PR. Scores each of the 5 rubric dimensions 0-20 "
            "(total 0-100). Set approved=true only if all 5 dimensions score at least 12/20. "
            "After reviewing, if approved=true, you may call merge_pr in the same cycle."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "pr_number": {"type": "integer", "description": "GitHub PR number"},
                "manifesto_score": {
                    "type": "integer", "minimum": 0, "maximum": 20,
                    "description": "Does this serve digital self-reliance? Aligned with the manifesto?",
                },
                "simplicity_score": {
                    "type": "integer", "minimum": 0, "maximum": 20,
                    "description": "Can this run on a Raspberry Pi 4? No unnecessary dependencies?",
                },
                "security_score": {
                    "type": "integer", "minimum": 0, "maximum": 20,
                    "description": "No open ports with default passwords, no telemetry, no phoning home?",
                },
                "quality_score": {
                    "type": "integer", "minimum": 0, "maximum": 20,
                    "description": "Readable, tested, documented? A non-developer can understand the docs?",
                },
                "scope_score": {
                    "type": "integer", "minimum": 0, "maximum": 20,
                    "description": "Does the PR match its stated task? No scope creep?",
                },
                "summary": {
                    "type": "string",
                    "description": "Review comment posted to GitHub. Be specific about what's good and what needs fixing. Max 1000 chars.",
                },
                "approved": {
                    "type": "boolean",
                    "description": "True only if all 5 scores are 12+ and no manifesto violations.",
                },
            },
            "required": [
                "pr_number", "manifesto_score", "simplicity_score", "security_score",
                "quality_score", "scope_score", "summary", "approved",
            ],
        },
    },
    {
        "name": "merge_pr",
        "description": (
            "Merge an approved PR into main. Only call after review_pr with approved=true. "
            "The gateway will verify CI checks are passing before allowing the merge. "
            "Prefer squash merges to keep history clean."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "pr_number": {"type": "integer"},
                "merge_method": {
                    "type": "string",
                    "enum": ["squash", "merge", "rebase"],
                    "description": "squash is preferred for feature work.",
                },
                "commit_message": {
                    "type": "string",
                    "description": "Squash commit message. If empty, GitHub uses the PR title.",
                },
            },
            "required": ["pr_number"],
        },
    },
    {
        "name": "update_roadmap",
        "description": "Update the status or notes for a roadmap epic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "epic": {"type": "string", "description": "Epic slug from ROADMAP.md"},
                "status": {
                    "type": "string",
                    "enum": ["planned", "active", "completed"],
                    "description": "New status for the epic.",
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes to append to the roadmap entry.",
                },
            },
            "required": ["epic", "status"],
        },
    },
    {
        "name": "broadcast",
        "description": (
            "Emit an orchestrator.broadcast event visible to all SSE viewers. "
            "Use at the end of each cycle to summarize what was done. "
            "Also use to alert on unusual conditions. Max 500 chars."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Plain text message. Shown in the live viewer. Max 500 chars.",
                    "maxLength": 500,
                },
            },
            "required": ["message"],
        },
    },
    {
        "name": "flag_agent",
        "description": (
            "Flag an agent for bad behavior (spam PRs, off-task work, repeated rule violations). "
            "Flagged agents cannot claim new tasks. Use sparingly — only for clear violations."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_id": {"type": "string", "description": "UUID of the agent to flag"},
                "reason": {
                    "type": "string",
                    "description": "Clear explanation of the violation. This is stored and visible.",
                },
            },
            "required": ["agent_id", "reason"],
        },
    },
    {
        "name": "pause",
        "description": (
            "Pause orchestration. No further cycles will run until a human resumes via the gateway API. "
            "Use when: API budget limit is approaching, a critical error requires human review, "
            "or the manifesto is being violated in a way you cannot resolve alone. "
            "Always broadcast before pausing."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Reason for pausing. Shown to humans who check the gateway.",
                },
            },
            "required": ["reason"],
        },
    },
]
