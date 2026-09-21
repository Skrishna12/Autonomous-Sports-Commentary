from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, Iterator
from uuid import uuid4

from sqlalchemy.orm import Session

from ascs.models import Delivery, GameStateSnapshot, Match
from ascs.replay.state import apply_delivery, initial_state, scorecard_view


OnEvent = Callable[[dict[str, Any], dict[str, Any]], None]


@dataclass
class ReplaySession:
    session_id: str
    match_id: str
    deliveries: list[dict[str, Any]]
    state: dict[str, Any]
    cursor: int = 0
    paused: bool = False
    interval_seconds: float = 3.0
    commentary: list[dict[str, Any]] = field(default_factory=list)

    @property
    def done(self) -> bool:
        return self.cursor >= len(self.deliveries)

    def peek(self) -> dict[str, Any] | None:
        if self.done:
            return None
        return self.deliveries[self.cursor]


class ReplayEngine:
    def __init__(self, session_factory, on_event: OnEvent | None = None):
        self.session_factory = session_factory
        self.on_event = on_event
        self.sessions: dict[str, ReplaySession] = {}

    def _delivery_dicts(self, match_id: str) -> list[dict[str, Any]]:
        db: Session
        with self.session_factory() as db:
            rows = (
                db.query(Delivery)
                .filter(Delivery.match_id == match_id)
                .order_by(Delivery.sequence.asc())
                .all()
            )
        out = []
        for r in rows:
            out.append(
                {
                    "match_id": r.match_id,
                    "innings": r.innings,
                    "batting_team": r.batting_team,
                    "over": r.over,
                    "ball_in_over": r.ball_in_over,
                    "sequence": r.sequence,
                    "actual_delivery": r.actual_delivery,
                    "batter": r.batter,
                    "bowler": r.bowler,
                    "non_striker": r.non_striker,
                    "runs_batter": r.runs_batter,
                    "runs_extras": r.runs_extras,
                    "runs_total": r.runs_total,
                    "extras_type": r.extras_type,
                    "extras_json": r.extras_json,
                    "wicket_kind": r.wicket_kind,
                    "player_out": r.player_out,
                    "fielders": r.fielders,
                    "is_wicket": r.is_wicket,
                    "is_boundary": r.is_boundary,
                    "raw": r.raw,
                }
            )
        return out

    def start(self, match_id: str, interval_seconds: float = 3.0, session_id: str | None = None) -> ReplaySession:
        with self.session_factory() as db:
            match = db.query(Match).filter_by(match_id=match_id).one()
            match_payload = {
                "match_id": match.match_id,
                "teams": match.teams,
                "match_type": match.match_type,
                "overs_limit": match.overs_limit,
                "balls_per_over": match.balls_per_over,
                "venue": match.venue,
                "toss": match.toss,
                "outcome": match.outcome,
            }
        deliveries = self._delivery_dicts(match_id)
        state = initial_state(match_payload)
        rs = ReplaySession(
            session_id=session_id or uuid4().hex[:12],
            match_id=match_id,
            deliveries=deliveries,
            state=state,
            interval_seconds=interval_seconds,
        )
        self.sessions[rs.session_id] = rs
        return rs

    def tick(self, session_id: str) -> dict[str, Any] | None:
        rs = self.sessions[session_id]
        if rs.paused or rs.done:
            return None
        delivery = rs.deliveries[rs.cursor]
        rs.cursor += 1
        rs.state = apply_delivery(rs.state, delivery)
        rs.state["session_id"] = rs.session_id
        if rs.done:
            rs.state["status"] = "complete"
            rs.state["complete"] = True
        with self.session_factory() as db:
            snap = GameStateSnapshot(
                session_id=rs.session_id,
                match_id=rs.match_id,
                sequence=rs.state["sequence"],
                state_json=scorecard_view(rs.state),
            )
            db.add(snap)
            db.commit()
        if self.on_event:
            self.on_event(delivery, rs.state)
        return {"delivery": delivery, "state": scorecard_view(rs.state)}

    def run_all(self, session_id: str, sleep: bool = False) -> Iterator[dict[str, Any]]:
        rs = self.sessions[session_id]
        while not rs.done:
            if rs.paused:
                time.sleep(0.05)
                continue
            event = self.tick(session_id)
            if event:
                yield event
            if sleep:
                time.sleep(rs.interval_seconds)

    def pause(self, session_id: str, paused: bool = True) -> None:
        self.sessions[session_id].paused = paused
