from pathlib import Path

from ascs.agents.graph import CommentarySupervisor
from ascs.agents.templates import play_by_play
from ascs.agents.tools import assert_readonly_sql
from ascs.eval.judge import factual_accuracy
from ascs.etl.flatten import flatten_match
from ascs.etl.ingest import load_json
from ascs.replay.state import apply_delivery, initial_state
import pytest


def test_readonly_sql_blocks_writes():
    with pytest.raises(ValueError):
        assert_readonly_sql("DELETE FROM deliveries")
    assert_readonly_sql("SELECT * FROM deliveries LIMIT 1")


def test_commentary_grounded_accuracy():
    payload = load_json(Path("data/samples/mini_t20.json"))
    flat = flatten_match("mini_t20", payload)
    scores = []
    supervisor = CommentarySupervisor()
    state = initial_state(flat["match"])
    for d in flat["deliveries"]:
        state = apply_delivery(state, d)
        out = supervisor.invoke({"event": d, "game_state": state, "language": "en"})
        text = out["pbp_text"]
        scores.append(factual_accuracy(d, text))
        # template itself must stay grounded
        scores.append(factual_accuracy(d, play_by_play(d, "en")))
    assert sum(scores) / len(scores) >= 0.95
