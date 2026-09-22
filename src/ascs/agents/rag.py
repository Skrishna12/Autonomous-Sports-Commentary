"""Retrieve relevant deliveries for Q&A (RAG over the stats tables)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from ascs.models import Delivery


def retrieve_deliveries(session: Session, match_id: str, question: str, k: int = 8) -> list[dict[str, Any]]:
    tokens = [t for t in re.findall(r"[A-Za-z]{3,}", question.lower()) if t not in {"what", "when", "which", "have", "does", "this", "that", "innings", "match"}]
    rows = (
        session.query(Delivery)
        .filter(Delivery.match_id == match_id)
        .order_by(Delivery.sequence.asc())
        .all()
    )
    scored: list[tuple[int, dict[str, Any]]] = []
    for r in rows:
        blob = " ".join(
            str(x).lower()
            for x in (r.batter, r.bowler, r.non_striker, r.player_out, r.wicket_kind, r.extras_type, r.batting_team)
            if x
        )
        hits = sum(1 for t in tokens if t in blob)
        if r.is_wicket:
            hits += 1 if "wicket" in question.lower() else 0
        if r.is_boundary:
            hits += 1 if any(w in question.lower() for w in ("four", "six", "boundary")) else 0
        if hits:
            scored.append(
                (
                    hits,
                    {
                        "sequence": r.sequence,
                        "actual_delivery": r.actual_delivery,
                        "batter": r.batter,
                        "bowler": r.bowler,
                        "runs_total": r.runs_total,
                        "is_wicket": r.is_wicket,
                        "wicket_kind": r.wicket_kind,
                        "player_out": r.player_out,
                    },
                )
            )
    scored.sort(key=lambda x: (-x[0], x[1]["sequence"]))
    return [s[1] for s in scored[:k]]
