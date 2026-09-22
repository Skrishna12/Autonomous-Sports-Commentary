#!/usr/bin/env python3
"""stdio MCP-style stats server.

Tools wrap the Postgres/SQLite stats database. Compatible with Cursor MCP
and with LangGraph tool calling (`dispatch_tool`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from ascs.agents.tools import dispatch_tool, tool_catalog  # noqa: E402
from ascs.models import init_db, make_session_factory  # noqa: E402


def handle(message: dict) -> dict:
    method = message.get("method")
    req_id = message.get("id")
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {"name": "ascs-stats", "version": "0.1.0"},
                "capabilities": {"tools": {}},
            },
        }
    if method == "tools/list":
        tools = [
            {
                "name": t["name"],
                "description": t["description"],
                "inputSchema": {"type": "object", "additionalProperties": True},
            }
            for t in tool_catalog()
        ]
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}
    if method == "tools/call":
        params = message.get("params") or {}
        name = params.get("name")
        arguments = params.get("arguments") or {}
        engine = init_db()
        Session = make_session_factory(engine)
        with Session() as session:
            result = dispatch_tool(session, name, arguments)
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(result, default=str)}]},
        }
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown method {method}"}}


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        message = json.loads(line)
        sys.stdout.write(json.dumps(handle(message)) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
