from __future__ import annotations

from copy import deepcopy
from typing import Any


def empty_innings(team: str) -> dict[str, Any]:
    return {
        "team": team,
        "runs": 0,
        "wickets": 0,
        "legal_balls": 0,
        "extras": 0,
        "fours": 0,
        "sixes": 0,
        "overs": "0.0",
        "batters": {},
        "bowlers": {},
        "striker": None,
        "non_striker": None,
        "current_bowler": None,
        "partnership_runs": 0,
        "partnership_balls": 0,
        "fall_of_wickets": [],
    }


def initial_state(match: dict[str, Any]) -> dict[str, Any]:
    teams = match.get("teams") or []
    return {
        "match_id": match.get("match_id"),
        "teams": teams,
        "match_type": match.get("match_type"),
        "overs_limit": match.get("overs_limit") or 20,
        "balls_per_over": match.get("balls_per_over") or 6,
        "venue": match.get("venue"),
        "toss": match.get("toss"),
        "status": "not_started",
        "innings_no": 0,
        "sequence": 0,
        "last_delivery": None,
        "innings": [empty_innings(t) for t in teams],
        "complete": False,
        "winner": (match.get("outcome") or {}).get("winner"),
    }


def _batter(inn: dict[str, Any], name: str) -> dict[str, Any]:
    inn["batters"].setdefault(name, {"name": name, "runs": 0, "balls": 0, "fours": 0, "sixes": 0, "out": False, "dismissal": None})
    return inn["batters"][name]


def _bowler(inn: dict[str, Any], name: str) -> dict[str, Any]:
    inn["bowlers"].setdefault(
        name, {"name": name, "balls": 0, "runs": 0, "wickets": 0, "wides": 0, "noballs": 0}
    )
    return inn["bowlers"][name]


def _overs_str(legal_balls: int, bpo: int) -> str:
    return f"{legal_balls // bpo}.{legal_balls % bpo}"


def is_legal_ball(delivery: dict[str, Any]) -> bool:
    extras = delivery.get("extras_type")
    return extras not in {"wides", "noballs"}


def apply_delivery(state: dict[str, Any], delivery: dict[str, Any]) -> dict[str, Any]:
    state = deepcopy(state)
    innings_no = int(delivery["innings"])
    state["innings_no"] = innings_no
    state["sequence"] = int(delivery["sequence"])
    state["status"] = "live"
    inn = state["innings"][innings_no - 1]
    inn["team"] = delivery["batting_team"]
    bpo = int(state["balls_per_over"])
    batter = delivery["batter"]
    non_striker = delivery["non_striker"]
    bowler = delivery["bowler"]
    inn["striker"] = batter
    inn["non_striker"] = non_striker
    inn["current_bowler"] = bowler
    b_stats = _batter(inn, batter)
    ns_stats = _batter(inn, non_striker)
    bowl = _bowler(inn, bowler)
    total = int(delivery["runs_total"])
    batter_runs = int(delivery["runs_batter"])
    extras = int(delivery["runs_extras"])
    inn["runs"] += total
    inn["extras"] += extras
    inn["partnership_runs"] += total
    inn["partnership_balls"] += 1
    legal = is_legal_ball(delivery)
    if legal:
        inn["legal_balls"] += 1
        b_stats["balls"] += 1
        bowl["balls"] += 1
    b_stats["runs"] += batter_runs
    bowl["runs"] += total
    if batter_runs == 4:
        b_stats["fours"] += 1
        inn["fours"] += 1
    if batter_runs == 6:
        b_stats["sixes"] += 1
        inn["sixes"] += 1
    if delivery.get("extras_type") == "wides":
        bowl["wides"] += extras or 1
    if delivery.get("extras_type") == "noballs":
        bowl["noballs"] += extras or 1
    if delivery.get("is_wicket"):
        inn["wickets"] += 1
        out_name = delivery.get("player_out") or batter
        dismissed = _batter(inn, out_name)
        dismissed["out"] = True
        dismissed["dismissal"] = delivery.get("wicket_kind")
        bowl["wickets"] += 1
        inn["fall_of_wickets"].append(
            {"player": out_name, "kind": delivery.get("wicket_kind"), "score": inn["runs"], "over": delivery.get("actual_delivery")}
        )
        inn["partnership_runs"] = 0
        inn["partnership_balls"] = 0
    inn["overs"] = _overs_str(inn["legal_balls"], bpo)
    if legal and batter_runs % 2 == 1:
        inn["striker"], inn["non_striker"] = inn["non_striker"], inn["striker"]
    elif delivery.get("extras_type") == "wides":
        pass
    state["last_delivery"] = delivery
    return state


def strike_rate(runs: int, balls: int) -> float:
    if balls <= 0:
        return 0.0
    return round(100.0 * runs / balls, 2)


def economy(runs: int, balls: int, bpo: int = 6) -> float:
    if balls <= 0:
        return 0.0
    return round(runs / (balls / bpo), 2)


def required_run_rate(state: dict[str, Any]) -> float | None:
    if state.get("innings_no", 0) < 2:
        return None
    first = state["innings"][0]["runs"]
    second = state["innings"][1]
    target = first + 1
    needed = target - second["runs"]
    bpo = state["balls_per_over"]
    remaining = state["overs_limit"] * bpo - second["legal_balls"]
    if remaining <= 0:
        return None
    return round(needed / (remaining / bpo), 2)


def scorecard_view(state: dict[str, Any]) -> dict[str, Any]:
    cards = []
    for inn in state["innings"]:
        batters = []
        for b in inn["batters"].values():
            batters.append({**b, "strike_rate": strike_rate(b["runs"], b["balls"])})
        bowlers = []
        for bw in inn["bowlers"].values():
            bowlers.append({**bw, "economy": economy(bw["runs"], bw["balls"], state["balls_per_over"])})
        cards.append(
            {
                **{k: inn[k] for k in ("team", "runs", "wickets", "overs", "extras", "fours", "sixes", "striker", "non_striker", "current_bowler", "partnership_runs", "partnership_balls", "fall_of_wickets")},
                "batters": batters,
                "bowlers": bowlers,
            }
        )
    return {
        "match_id": state.get("match_id"),
        "status": state.get("status"),
        "innings_no": state.get("innings_no"),
        "sequence": state.get("sequence"),
        "required_run_rate": required_run_rate(state),
        "innings": cards,
        "last_delivery": state.get("last_delivery"),
    }
