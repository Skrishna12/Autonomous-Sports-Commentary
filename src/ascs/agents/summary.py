from __future__ import annotations

from typing import Any


def highlights_from_state(scorecard: dict[str, Any]) -> list[dict[str, Any]]:
    clips: list[dict[str, Any]] = []
    for inn in scorecard.get("innings") or []:
        team = inn.get("team")
        for w in inn.get("fall_of_wickets") or []:
            clips.append(
                {
                    "kind": "wicket",
                    "team": team,
                    "text": f"Wicket: {w.get('player')} {w.get('kind')} at {w.get('score')} ({w.get('over')}).",
                }
            )
        for b in inn.get("batters") or []:
            if b.get("sixes"):
                clips.append({"kind": "sixes", "team": team, "text": f"{b['name']} hit {b['sixes']} six{'es' if b['sixes'] != 1 else ''}."})
            if b.get("fours"):
                clips.append({"kind": "fours", "team": team, "text": f"{b['name']} struck {b['fours']} four{'s' if b['fours'] != 1 else ''}."})
    last = scorecard.get("last_delivery")
    if last and (last.get("is_wicket") or last.get("is_boundary")):
        clips.append(
            {
                "kind": "latest",
                "text": f"Latest highlight: {last.get('actual_delivery')} {last.get('batter')} off {last.get('bowler')}.",
            }
        )
    return clips[:12]


def post_match_summary(scorecard: dict[str, Any], language: str = "en") -> str:
    innings = [i for i in (scorecard.get("innings") or []) if i.get("batters")]
    if not innings:
        return "No balls have been bowled yet."
    bits = []
    for inn in innings:
        bits.append(f"{inn.get('team')} {inn.get('runs')}/{inn.get('wickets')} in {inn.get('overs')} overs")
    winner = scorecard.get("winner")
    lead = "Post-match: " + "; ".join(bits) + "."
    if winner:
        lead += f" {winner} won (Cricsheet outcome)."
    top = []
    for inn in innings:
        batters = sorted(inn.get("batters") or [], key=lambda b: b.get("runs") or 0, reverse=True)
        if batters:
            b = batters[0]
            top.append(f"{b['name']} {b['runs']} off {b['balls']}")
    if top:
        lead += " Top scores: " + ", ".join(top) + "."
    if language == "hi":
        return "मैच सारांश: " + lead
    if language == "ta":
        return "போட்டி சுருக்கம்: " + lead
    return lead
