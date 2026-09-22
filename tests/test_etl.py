from pathlib import Path

from ascs.etl.flatten import flatten_match
from ascs.etl.ingest import load_json


def test_flatten_mini_match():
    path = Path("data/samples/mini_t20.json")
    payload = load_json(path)
    flat = flatten_match("mini_t20", payload, str(path))
    assert flat["match"]["teams"] == ["Marina Strikers", "Harbour Hawks"]
    assert len(flat["deliveries"]) == 20
    assert any(d["is_wicket"] for d in flat["deliveries"])
    assert any(d["extras_type"] == "wides" for d in flat["deliveries"])
    assert any(d["extras_type"] == "noballs" for d in flat["deliveries"])
    inn1 = [d for d in flat["deliveries"] if d["innings"] == 1]
    assert sum(d["runs_total"] for d in inn1) == 23
    assert len(flat["players"]) == 10
    assert flat["partnerships"]
