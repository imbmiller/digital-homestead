"""
Unit tests for the orchestrator cycle.
Uses respx to mock the gateway and Anthropic API calls.
"""
import json
import pytest
import respx
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

from orchestrator.cycle import OrchestratorCycle
from orchestrator.gateway_client import GatewayClient
from orchestrator.tool_dispatcher import dispatch
from orchestrator.tool_schemas import ORCHESTRATOR_TOOLS


# ── Tool dispatcher tests ──────────────────────────────────────────────────

async def test_dispatch_unknown_tool():
    gateway = MagicMock()
    result = await dispatch(gateway, "nonexistent_tool", {})
    assert "Unknown tool" in result


async def test_dispatch_broadcast():
    gateway = AsyncMock()
    gateway.broadcast = AsyncMock()
    result = await dispatch(gateway, "broadcast", {"message": "Hello world"})
    gateway.broadcast.assert_called_once_with("Hello world")
    assert "Hello world" in result


async def test_dispatch_create_task():
    gateway = AsyncMock()
    gateway.create_task = AsyncMock(return_value={"id": "abc-123", "title": "My task"})
    result = await dispatch(gateway, "create_task", {
        "title": "My task",
        "description": "Do the thing",
        "priority": 3,
        "epic": "infrastructure",
    })
    assert "abc-123" in result or "My task" in result


async def test_dispatch_flag_agent():
    gateway = AsyncMock()
    gateway.flag_agent = AsyncMock()
    result = await dispatch(gateway, "flag_agent", {"agent_id": "uuid-1", "reason": "spamming"})
    gateway.flag_agent.assert_called_once_with("uuid-1", "spamming")
    assert "uuid-1" in result


async def test_dispatch_pause():
    gateway = AsyncMock()
    gateway.broadcast = AsyncMock()
    gateway.pause = AsyncMock()
    result = await dispatch(gateway, "pause", {"reason": "budget exceeded"})
    gateway.pause.assert_called_once_with("budget exceeded")
    assert "budget exceeded" in result


# ── Tool schema validation ─────────────────────────────────────────────────

def test_all_tool_schemas_have_required_fields():
    required_tool_names = {
        "create_task", "review_pr", "merge_pr", "update_roadmap",
        "broadcast", "flag_agent", "pause",
    }
    schema_names = {t["name"] for t in ORCHESTRATOR_TOOLS}
    assert required_tool_names == schema_names


def test_tool_schemas_have_input_schema():
    for tool in ORCHESTRATOR_TOOLS:
        assert "input_schema" in tool, f"Tool {tool['name']} missing input_schema"
        assert tool["input_schema"]["type"] == "object"
        assert "required" in tool["input_schema"]


# ── Context builder ────────────────────────────────────────────────────────

async def test_context_builder_returns_6_blocks():
    gateway = AsyncMock()
    gateway.list_tasks = AsyncMock(return_value=[])
    gateway.list_prs = AsyncMock(return_value=[])
    gateway.get_health = AsyncMock(return_value={"active_agents": 0, "last_cycle": None})

    with patch("orchestrator.context_builder._fetch_github_file", return_value="# Mock content"):
        with patch("orchestrator.context_builder._fetch_recent_commits", return_value="abc1234 message"):
            from orchestrator.context_builder import build_context
            blocks = await build_context(gateway, cycle_number=1)

    assert len(blocks) == 6
    # Section 1 should have cache_control
    assert "cache_control" in blocks[0]
    assert "MANIFESTO" in blocks[0]["text"]
    # Section 6 should have budget info
    assert "BUDGET" in blocks[5]["text"]
