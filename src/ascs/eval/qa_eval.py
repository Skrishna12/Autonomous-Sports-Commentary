from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from ascs.agents.qa import answer_question
from ascs.models import Delivery, Match
from ascs.replay.state import apply_delivery, initial_state, scorecard_view


def _replay_card(session: Session, match_id: str) -> dict[str, Any]:
    match = session.query(Match).filter_by(match_id=match_id).one()
    deliveries = (
        session.query(Delivery).filter_by(match_id=match_id).order_by(Delivery.sequence.asc()).all()
    )
    state = initial_state(
        {
            "match_id": match.match_id,
            "teams": match.teams,
            "match_type": match.match_type,
            "overs_limit": match.overs_limit,
            "balls_per_over": match.balls_per_over,
            "venue": match.venue,
            "toss": match.toss,
            "outcome": match.outcome,
        }
    )
    for d in deliveries:
        state = apply_delivery(
            state,
            {
                "match_id": d.match_id,
                "innings": d.innings,
                "batting_team": d.batting_team,
                "over": d.over,
                "ball_in_over": d.ball_in_over,
                "sequence": d.sequence,
                "actual_delivery": d.actual_delivery,
                "batter": d.batter,
                "bowler": d.bowler,
                "non_striker": d.non_striker,
                "runs_batter": d.runs_batter,
                "runs_extras": d.runs_extras,
                "runs_total": d.runs_total,
                "extras_type": d.extras_type,
                "wicket_kind": d.wicket_kind,
                "player_out": d.player_out,
                "fielders": d.fielders,
                "is_wicket": d.is_wicket,
                "is_boundary": d.is_boundary,
            },
        )
    return scorecard_view(state)


def build_question_set(session: Session, match_id: str) -> list[dict[str, Any]]:
    card = _replay_card(session, match_id)
    questions: list[dict[str, Any]] = []

    def add(q: str, contains: list[Any]):
        questions.append({"question": q, "must_contain": [str(c) for c in contains if c not in (None, "")]})

    started = [inn for inn in card.get("innings") or [] if inn.get("batters")]
    score_bits = []
    for inn in started:
        score_bits.extend([inn["runs"], inn["wickets"]])
    add("What is the score?", score_bits[:4])

    cur = started[-1] if started else {}
    if cur.get("striker"):
        add("Who is batting?", [cur.get("striker"), cur.get("non_striker")])
    if cur.get("current_bowler"):
        add("Who is bowling?", [cur.get("current_bowler")])
    add("What is the current partnership?", [cur.get("partnership_runs")])
    if card.get("required_run_rate") is not None:
        add("What is the required run rate?", [card["required_run_rate"]])
    if len(started) > 1:
        add("What is the target?", [int(started[0]["runs"]) + 1])

    for inn in started:
        team = inn["team"]
        add(f"What is the {team} score?", [inn["runs"], inn["wickets"]])
        add(f"How many extras in the {team} innings?", [inn.get("extras", 0)])
        add(f"How many sixes have {team} hit?", [inn.get("sixes", 0)])
        add(f"How many fours have {team} hit?", [inn.get("fours", 0)])
        if inn.get("fall_of_wickets"):
            last = inn["fall_of_wickets"][-1]
            add(f"Who got out last for {team}?", [last["player"].split()[-1]])
        for b in inn.get("batters") or []:
            add(f"How many runs has {b['name']} scored?", [b["runs"]])
        for bw in inn.get("bowlers") or []:
            add(f"Bowling figures for {bw['name']}", [bw["wickets"], bw["runs"]])

    # Repeat grounded batter questions to reach 50 without dummy mismatches.
    pool = [item for item in questions if item["question"].startswith("How many runs has")]
    i = 0
    while len(questions) < 50 and pool:
        questions.append(pool[i % len(pool)])
        i += 1
    return questions[:50]


def grade_answer(answer: str, must_contain: list[str]) -> bool:
    text = answer.lower()
    needed = [c for c in must_contain if c not in (None, "")]
    if not needed:
        return False
    return all(str(c).lower() in text for c in needed)


def run_qa_eval(session: Session, match_id: str) -> dict[str, Any]:
    card = _replay_card(session, match_id)
    qs = build_question_set(session, match_id)
    results = []
    for item in qs:
        ans = answer_question(item["question"], card, session, match_id)
        ok = grade_answer(ans, item["must_contain"])
        results.append({**item, "answer": ans, "correct": ok})
    accuracy = sum(1 for r in results if r["correct"]) / len(results)
    return {"n": len(results), "accuracy": accuracy, "results": results}


def dump_question_set(path: str, session: Session, match_id: str) -> None:
    qs = build_question_set(session, match_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(qs, f, indent=2)
