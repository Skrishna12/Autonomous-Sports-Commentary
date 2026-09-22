from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from ascs.agents.rag import retrieve_deliveries
from ascs.agents.tools import batter_innings, bowler_innings, partnerships


def _innings_started(inn: dict[str, Any]) -> bool:
    return bool(inn.get("batters") or inn.get("runs") or inn.get("legal_balls"))


def score_summary(scorecard: dict[str, Any]) -> str:
    parts = []
    for inn in scorecard.get("innings") or []:
        if not _innings_started(inn):
            continue
        parts.append(f"{inn.get('team')} {inn.get('runs')}/{inn.get('wickets')} ({inn.get('overs')} overs)")
    if not parts:
        return "The match has not started yet, so I do not have a scorecard."
    return "Score: " + "; ".join(parts) + "."


def _find_team_innings(scorecard: dict[str, Any], fragment: str) -> dict[str, Any] | None:
    fragment = fragment.lower()
    for inn in scorecard.get("innings") or []:
        team = (inn.get("team") or "").lower()
        if fragment in team or team in fragment:
            return inn
    return None


def _current_innings(scorecard: dict[str, Any]) -> dict[str, Any]:
    innings = [i for i in (scorecard.get("innings") or []) if _innings_started(i)]
    if not innings:
        return {}
    idx = int(scorecard.get("innings_no") or len(innings)) - 1
    if 0 <= idx < len(scorecard.get("innings") or []):
        current = scorecard["innings"][idx]
        if _innings_started(current):
            return current
    return innings[-1]


def answer_question(question: str, scorecard: dict[str, Any], session: Session | None, match_id: str | None) -> str:
    q = question.lower().strip()
    if not any(_innings_started(i) for i in scorecard.get("innings") or []):
        return "The match has not started yet, so I do not have a scorecard."

    if session and match_id and any(w in q for w in ("which ball", "when did", "who hit", "who was out", "boundary")):
        hits = retrieve_deliveries(session, match_id, question)
        if hits:
            first = hits[0]
            return (
                f"From the ball log: {first['actual_delivery']} {first['batter']} off {first['bowler']}, "
                f"{first['runs_total']} run(s)"
                + (f", {first['player_out']} {first['wicket_kind']}" if first.get("is_wicket") else "")
                + "."
            )

    team_inn = None
    for inn in scorecard.get("innings") or []:
        team = inn.get("team") or ""
        if team and team.lower() in q:
            team_inn = inn
            break
    inn = team_inn or _current_innings(scorecard)

    if re.search(r"\b(score|total|what's the score|what is the score)\b", q) and not team_inn:
        return score_summary(scorecard)

    if team_inn and re.search(r"\b(score|total|how many)\b", q) and "six" not in q and "four" not in q and "extra" not in q and "run" not in q:
        return f"{team_inn.get('team')} are {team_inn.get('runs')}/{team_inn.get('wickets')} after {team_inn.get('overs')} overs."

    if "who is batting" in q or "on strike" in q:
        cur = _current_innings(scorecard)
        return f"{cur.get('striker')} is on strike, {cur.get('non_striker')} at the other end."

    if "who is bowling" in q or "current bowler" in q:
        cur = _current_innings(scorecard)
        return f"{cur.get('current_bowler')} is bowling."

    if "required" in q or "run rate" in q:
        rrr = scorecard.get("required_run_rate")
        if rrr is None:
            return "No chase is in progress yet, so there is no required run rate."
        return f"The required run rate is {rrr}."

    if "partnership" in q:
        cur = _current_innings(scorecard)
        return f"The current partnership is {cur.get('partnership_runs')} runs off {cur.get('partnership_balls')} balls."

    if "wicket" in q and ("last" in q or "how" in q or "who" in q):
        cur = team_inn or _current_innings(scorecard)
        fow = cur.get("fall_of_wickets") or []
        if not fow:
            return "No wickets have fallen in this innings yet."
        last = fow[-1]
        return f"{last['player']} was {last['kind']} at {last['score']} in over {last['over']}."

    if "how many sixes" in q:
        return f"{inn.get('team')} have hit {inn.get('sixes')} sixes this innings."

    if "how many fours" in q:
        return f"{inn.get('team')} have hit {inn.get('fours')} fours this innings."

    if "extras" in q:
        return f"Extras in this innings ({inn.get('team')}): {inn.get('extras')}."

    m = re.search(r"how many (?:runs )?(?:has|have) (.+?) (?:scored|got|made)", q)
    if m and session and match_id:
        player = _resolve_player(m.group(1).strip(" ?"), scorecard)
        stats = batter_innings(session, match_id, player)
        return f"{stats['player']} has {stats['runs']} off {stats['balls']} (SR {stats['strike_rate']})."

    m = re.search(r"(?:figures|bowling) (?:for|of) (.+)", q)
    if m and session and match_id:
        player = _resolve_player(m.group(1).strip(" ?"), scorecard)
        stats = bowler_innings(session, match_id, player)
        return (
            f"{stats['player']} has {stats['wickets']}/{stats['runs']} from {stats['balls']} legal balls, "
            f"economy {stats['economy']}."
        )

    if "target" in q:
        first = (scorecard.get("innings") or [{}])[0]
        if not _innings_started(first) or scorecard.get("innings_no", 0) < 2:
            return "The first innings is still in progress, so there is no target yet."
        target = int(first.get("runs") or 0) + 1
        return f"The target is {target}."

    if session and match_id and "biggest partnership" in q:
        rows = partnerships(session, match_id)
        if not rows:
            return "No partnership rows are stored yet."
        best = max(rows, key=lambda r: r["runs"])
        return f"The highest stored partnership is {best['runs']} between {best['batter_1']} and {best['batter_2']}."

    if team_inn:
        return (
            f"{team_inn.get('team')} are {team_inn.get('runs')}/{team_inn.get('wickets')} "
            f"after {team_inn.get('overs')} overs."
        )

    return (
        "I can only answer from the live scorecard and stats tables. "
        "Ask about the score, strike, bowler, a batter's runs, bowling figures, extras, or wickets."
    )


def _resolve_player(fragment: str, scorecard: dict[str, Any]) -> str:
    fragment = fragment.lower()
    names = []
    for inn in scorecard.get("innings") or []:
        for b in inn.get("batters") or []:
            names.append(b["name"])
        for bw in inn.get("bowlers") or []:
            names.append(bw["name"])
        for key in ("striker", "non_striker", "current_bowler"):
            if inn.get(key):
                names.append(inn[key])
    for name in names:
        if fragment in name.lower() or name.lower() in fragment:
            return name
    return fragment.title()
