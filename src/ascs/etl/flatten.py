from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from ascs.models import Delivery, Match, Partnership, Player


def extras_type(delivery: dict[str, Any]) -> str | None:
    extras = delivery.get("extras") or {}
    if not extras:
        return None
    return next(iter(extras.keys()), None)


def flatten_match(match_id: str, payload: dict[str, Any], source_path: str | None = None) -> dict[str, Any]:
    info = payload.get("info") or {}
    match_row = {
        "match_id": match_id,
        "city": info.get("city"),
        "venue": info.get("venue"),
        "dates": info.get("dates"),
        "match_type": info.get("match_type"),
        "gender": info.get("gender"),
        "season": info.get("season"),
        "team_type": info.get("team_type"),
        "teams": info.get("teams"),
        "toss": info.get("toss"),
        "outcome": info.get("outcome"),
        "event": info.get("event"),
        "overs_limit": info.get("overs"),
        "balls_per_over": info.get("balls_per_over", 6),
        "player_of_match": info.get("player_of_match"),
        "raw_info": info,
        "source_path": source_path,
    }

    registry = ((info.get("registry") or {}).get("people")) or {}
    players: list[dict[str, Any]] = []
    for team, names in (info.get("players") or {}).items():
        for name in names:
            players.append(
                {
                    "match_id": match_id,
                    "team": team,
                    "player_name": name,
                    "registry_id": registry.get(name),
                }
            )

    deliveries: list[dict[str, Any]] = []
    partnerships: list[dict[str, Any]] = []
    sequence = 0
    for innings_idx, innings in enumerate(payload.get("innings") or [], start=1):
        batting_team = innings.get("team")
        current: dict[str, Any] | None = None
        ball_in_over = 0
        last_over = None
        for over in innings.get("overs") or []:
            over_no = int(over.get("over", 0))
            if last_over != over_no:
                ball_in_over = 0
                last_over = over_no
            for delivery in over.get("deliveries") or []:
                sequence += 1
                ball_in_over += 1
                wickets = delivery.get("wickets") or []
                wicket = wickets[0] if wickets else {}
                runs = delivery.get("runs") or {}
                batter_runs = int(runs.get("batter") or 0)
                extras_runs = int(runs.get("extras") or 0)
                total = int(runs.get("total") or 0)
                kind = extras_type(delivery)
                is_wicket = bool(wickets)
                fielders = []
                if wicket.get("fielders"):
                    fielders = [f.get("name") for f in wicket.get("fielders") if f.get("name")]
                row = {
                    "match_id": match_id,
                    "innings": innings_idx,
                    "batting_team": batting_team,
                    "over": over_no,
                    "ball_in_over": ball_in_over,
                    "sequence": sequence,
                    "actual_delivery": delivery.get("actual_delivery") or f"{over_no}.{ball_in_over}",
                    "batter": delivery.get("batter"),
                    "bowler": delivery.get("bowler"),
                    "non_striker": delivery.get("non_striker"),
                    "runs_batter": batter_runs,
                    "runs_extras": extras_runs,
                    "runs_total": total,
                    "extras_type": kind,
                    "extras_json": delivery.get("extras"),
                    "wicket_kind": wicket.get("kind"),
                    "player_out": wicket.get("player_out"),
                    "fielders": fielders or None,
                    "is_wicket": is_wicket,
                    "is_boundary": batter_runs in (4, 6) and not delivery.get("non_boundary"),
                    "raw": delivery,
                }
                deliveries.append(row)

                pair = tuple(sorted([delivery.get("batter"), delivery.get("non_striker")]))
                if current is None:
                    current = {
                        "match_id": match_id,
                        "innings": innings_idx,
                        "batting_team": batting_team,
                        "batter_1": pair[0],
                        "batter_2": pair[1],
                        "runs": 0,
                        "balls": 0,
                        "wicket_at_end": False,
                        "start_sequence": sequence,
                        "end_sequence": sequence,
                    }
                elif tuple(sorted([current["batter_1"], current["batter_2"]])) != pair:
                    partnerships.append(current)
                    current = {
                        "match_id": match_id,
                        "innings": innings_idx,
                        "batting_team": batting_team,
                        "batter_1": pair[0],
                        "batter_2": pair[1],
                        "runs": 0,
                        "balls": 0,
                        "wicket_at_end": False,
                        "start_sequence": sequence,
                        "end_sequence": sequence,
                    }
                current["runs"] += total
                current["balls"] += 1
                current["end_sequence"] = sequence
                if is_wicket:
                    current["wicket_at_end"] = True
                    partnerships.append(current)
                    current = None
        if current is not None:
            partnerships.append(current)

    return {
        "match": match_row,
        "players": players,
        "deliveries": deliveries,
        "partnerships": partnerships,
    }


def persist_flat(session: Session, flat: dict[str, Any]) -> str:
    match_id = flat["match"]["match_id"]
    session.query(Delivery).filter_by(match_id=match_id).delete()
    session.query(Partnership).filter_by(match_id=match_id).delete()
    session.query(Player).filter_by(match_id=match_id).delete()
    session.query(Match).filter_by(match_id=match_id).delete()
    session.add(Match(**flat["match"]))
    session.add_all(Player(**p) for p in flat["players"])
    session.add_all(Delivery(**d) for d in flat["deliveries"])
    session.add_all(Partnership(**p) for p in flat["partnerships"])
    session.commit()
    return match_id
