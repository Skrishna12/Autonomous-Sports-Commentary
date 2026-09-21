"""Read-only stats tools over the match database (MCP-style)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from ascs.models import Delivery, Partnership, Player
from ascs.replay.state import economy, strike_rate

_WRITE = re.compile(r"\b(insert|update|delete|drop|alter|attach|pragma|create)\b", re.I)


def assert_readonly_sql(sql: str) -> str:
    stripped = sql.strip().rstrip(";")
    if _WRITE.search(stripped):
        raise ValueError("Only read-only SELECT queries are allowed")
    if not stripped.lower().startswith("select"):
        raise ValueError("SQL must start with SELECT")
    return stripped


def sql_query(session: Session, sql: str, limit: int = 50) -> list[dict[str, Any]]:
    safe = assert_readonly_sql(sql)
    rows = session.execute(text(safe)).mappings().all()
    return [dict(r) for r in rows[:limit]]


def batter_innings(session: Session, match_id: str, player: str, innings: int | None = None) -> dict[str, Any]:
    q = session.query(Delivery).filter(Delivery.match_id == match_id, Delivery.batter == player)
    if innings is not None:
        q = q.filter(Delivery.innings == innings)
    rows = q.all()
    runs = sum(r.runs_batter for r in rows)
    balls = sum(1 for r in rows if r.extras_type not in {"wides"})
    fours = sum(1 for r in rows if r.runs_batter == 4)
    sixes = sum(1 for r in rows if r.runs_batter == 6)
    out_row = (
        session.query(Delivery)
        .filter(Delivery.match_id == match_id, Delivery.player_out == player)
        .first()
    )
    return {
        "player": player,
        "runs": runs,
        "balls": balls,
        "fours": fours,
        "sixes": sixes,
        "strike_rate": strike_rate(runs, balls),
        "dismissal": None if not out_row else {"kind": out_row.wicket_kind, "bowler": out_row.bowler},
    }


def bowler_innings(session: Session, match_id: str, player: str, innings: int | None = None) -> dict[str, Any]:
    q = session.query(Delivery).filter(Delivery.match_id == match_id, Delivery.bowler == player)
    if innings is not None:
        q = q.filter(Delivery.innings == innings)
    rows = q.all()
    runs = sum(r.runs_total for r in rows)
    balls = sum(1 for r in rows if r.extras_type not in {"wides", "noballs"})
    wickets = sum(1 for r in rows if r.is_wicket)
    return {
        "player": player,
        "runs": runs,
        "balls": balls,
        "wickets": wickets,
        "economy": economy(runs, balls),
    }


def partnerships(session: Session, match_id: str, innings: int | None = None) -> list[dict[str, Any]]:
    q = session.query(Partnership).filter(Partnership.match_id == match_id)
    if innings is not None:
        q = q.filter(Partnership.innings == innings)
    return [
        {
            "innings": p.innings,
            "batter_1": p.batter_1,
            "batter_2": p.batter_2,
            "runs": p.runs,
            "balls": p.balls,
        }
        for p in q.all()
    ]


def list_players(session: Session, match_id: str) -> list[dict[str, Any]]:
    return [{"team": p.team, "player": p.player_name} for p in session.query(Player).filter_by(match_id=match_id)]


def tool_catalog() -> list[dict[str, Any]]:
    return [
        {"name": "sql_query", "description": "Read-only SELECT against matches, deliveries, players, partnerships"},
        {"name": "batter_innings", "description": "Computed batting line for a player in this match"},
        {"name": "bowler_innings", "description": "Computed bowling figures for a player in this match"},
        {"name": "partnerships", "description": "Partnership totals by innings"},
        {"name": "list_players", "description": "Squads for the match"},
    ]


def dispatch_tool(session: Session, name: str, arguments: dict[str, Any]) -> Any:
    if name == "sql_query":
        return sql_query(session, arguments["sql"], arguments.get("limit", 50))
    if name == "batter_innings":
        return batter_innings(session, arguments["match_id"], arguments["player"], arguments.get("innings"))
    if name == "bowler_innings":
        return bowler_innings(session, arguments["match_id"], arguments["player"], arguments.get("innings"))
    if name == "partnerships":
        return partnerships(session, arguments["match_id"], arguments.get("innings"))
    if name == "list_players":
        return list_players(session, arguments["match_id"])
    raise ValueError(f"Unknown tool {name}")
