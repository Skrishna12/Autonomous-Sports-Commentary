from __future__ import annotations

from typing import Any


def _hi_wicket(kind: str | None) -> str:
    mapping = {
        "bowled": "बोल्ड",
        "caught": "कैच आउट",
        "lbw": "एलबीडब्ल्यू",
        "run out": "रन आउट",
        "stumped": "स्टंप",
        "hit wicket": "हिट विकेट",
    }
    return mapping.get((kind or "").lower(), kind or "आउट")


def _ta_wicket(kind: str | None) -> str:
    mapping = {
        "bowled": "போல்டு",
        "caught": "கேட்ச்",
        "lbw": "எல்பிடபிள்யூ",
        "run out": "ரன் அவுட்",
        "stumped": "ஸ்டம்ப்ட்",
        "hit wicket": "ஹிட் விக்கெட்",
    }
    return mapping.get((kind or "").lower(), kind or "விக்கெட்")


def play_by_play(event: dict[str, Any], language: str = "en") -> str:
    batter = event["batter"]
    bowler = event["bowler"]
    total = int(event["runs_total"])
    br = int(event["runs_batter"])
    ball = event.get("actual_delivery")
    extra = event.get("extras_type")
    if language == "hi":
        return _pbp_hi(event)
    if language == "ta":
        return _pbp_ta(event)
    if event.get("is_wicket"):
        out = event.get("player_out") or batter
        kind = event.get("wicket_kind") or "out"
        fielders = event.get("fielders") or []
        extra_bit = f", {fielders[0]}" if fielders else ""
        return f"{ball}: {bowler} to {batter} — {out} is {kind}{extra_bit}. {total} run{'s' if total != 1 else ''} on the wicket ball."
    if extra == "wides":
        return f"{ball}: Wide from {bowler} to {batter}, {total} extra{'s' if total != 1 else ''}."
    if extra == "noballs":
        return f"{ball}: No-ball, {bowler} to {batter}, {total} run{'s' if total != 1 else ''}."
    if extra in {"byes", "legbyes"}:
        return f"{ball}: {extra} — {total} to the total, {batter} still on strike against {bowler}."
    if br == 6:
        return f"{ball}: {batter} launches {bowler} for six! {total} from the ball."
    if br == 4:
        return f"{ball}: Four! {batter} through the field off {bowler}."
    if total == 0:
        return f"{ball}: {bowler} to {batter}, dot ball."
    return f"{ball}: {batter} takes {br} off {bowler}, {total} added."


def _pbp_hi(event: dict[str, Any]) -> str:
    batter, bowler, ball = event["batter"], event["bowler"], event.get("actual_delivery")
    total, br = int(event["runs_total"]), int(event["runs_batter"])
    if event.get("is_wicket"):
        out = event.get("player_out") or batter
        return f"{ball}: {bowler} से {batter} — {out} {_hi_wicket(event.get('wicket_kind'))}. इस गेंद पर {total} रन।"
    if event.get("extras_type") == "wides":
        return f"{ball}: {bowler} की वाइड, {batter} के लिए {total} अतिरिक्त रन।"
    if br == 6:
        return f"{ball}: {batter} ने {bowler} की गेंद पर छक्का!"
    if br == 4:
        return f"{ball}: चौका! {batter}, {bowler} के खिलाफ।"
    if total == 0:
        return f"{ball}: {bowler} से {batter}, डॉट बॉल।"
    return f"{ball}: {batter} ने {bowler} से {br} रन लिए।"


def _pbp_ta(event: dict[str, Any]) -> str:
    batter, bowler, ball = event["batter"], event["bowler"], event.get("actual_delivery")
    total, br = int(event["runs_total"]), int(event["runs_batter"])
    if event.get("is_wicket"):
        out = event.get("player_out") or batter
        return f"{ball}: {bowler} to {batter} — {out} {_ta_wicket(event.get('wicket_kind'))}. இந்தப் பந்து {total} ரன்."
    if event.get("extras_type") == "wides":
        return f"{ball}: {bowler} வைடு, {total} கூடுதல் ரன்."
    if br == 6:
        return f"{ball}: {batter} சிக்ஸ்! {bowler} மீது."
    if br == 4:
        return f"{ball}: ஃபோர்! {batter}, {bowler}."
    if total == 0:
        return f"{ball}: {bowler} to {batter}, டாட் பால்."
    return f"{ball}: {batter} {br} ரன் எடுத்தார் {bowler} இடமிருந்து."


def analyst_line(event: dict[str, Any], scorecard: dict[str, Any], tool_stats: dict[str, Any] | None = None, language: str = "en") -> str:
    innings = scorecard.get("innings") or []
    current = innings[int(scorecard.get("innings_no") or 1) - 1] if innings else {}
    team = current.get("team")
    runs = current.get("runs")
    wickets = current.get("wickets")
    overs = current.get("overs")
    partnership = current.get("partnership_runs")
    batter_name = event["batter"]
    b_line = None
    for b in current.get("batters") or []:
        if b["name"] == batter_name:
            b_line = b
            break
    bits = [f"{team} {runs}/{wickets} after {overs}"]
    if b_line:
        bits.append(f"{batter_name} {b_line['runs']} off {b_line['balls']}")
    if partnership is not None and not event.get("is_wicket"):
        bits.append(f"stand {partnership}")
    if tool_stats and tool_stats.get("bowler"):
        bw = tool_stats["bowler"]
        bits.append(f"{event['bowler']} {bw['wickets']}/{bw['runs']}")
    text = "; ".join(bits) + "."
    if language == "hi":
        return f"अंक: {team} {runs}/{wickets} ({overs}). {batter_name} {b_line['runs'] if b_line else 0} रन।"
    if language == "ta":
        return f"ஸ்கோர்: {team} {runs}/{wickets} ({overs})."
    return text


def should_analyst_speak(event: dict[str, Any], state: dict[str, Any]) -> bool:
    if event.get("is_wicket") or event.get("is_boundary"):
        return True
    if int(event.get("ball_in_over") or 0) >= 6:
        return True
    if int(state.get("sequence") or 0) == 1:
        return True
    return False
