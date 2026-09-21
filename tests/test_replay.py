from pathlib import Path

from ascs.etl.flatten import flatten_match
from ascs.etl.ingest import load_json
from ascs.replay.state import apply_delivery, initial_state, required_run_rate


def test_replay_totals_match_flatten():
    payload = load_json(Path("data/samples/mini_t20.json"))
    flat = flatten_match("mini_t20", payload)
    state = initial_state(flat["match"])
    for d in flat["deliveries"]:
        state = apply_delivery(state, d)
    inn1 = [d for d in flat["deliveries"] if d["innings"] == 1]
    inn2 = [d for d in flat["deliveries"] if d["innings"] == 2]
    assert state["innings"][0]["runs"] == sum(d["runs_total"] for d in inn1)
    assert state["innings"][1]["runs"] == sum(d["runs_total"] for d in inn2)
    assert state["innings"][0]["wickets"] == 1
    assert state["innings"][1]["wickets"] == 1
    assert required_run_rate(state) is not None
    reddy = state["innings"][0]["batters"]["A Reddy"]
    assert reddy["runs"] == 8
