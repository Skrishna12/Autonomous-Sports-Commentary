from pathlib import Path

from ascs.agents.rag import retrieve_deliveries
from ascs.agents.summary import post_match_summary
from ascs.eval.wer import word_error_rate
from ascs.etl.flatten import flatten_match, persist_flat
from ascs.etl.ingest import load_json
from ascs.models import init_db, make_session_factory
from ascs.replay.engine import ReplayEngine
from ascs.eval.uptime import replay_uptime


def test_rag_and_summary(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'r.db'}"
    engine = init_db(url=url)
    Session = make_session_factory(engine)
    payload = load_json(Path("data/samples/mini_t20.json"))
    with Session() as session:
        persist_flat(session, flatten_match("mini_t20", payload))
        hits = retrieve_deliveries(session, "mini_t20", "who was out caught")
        assert hits
        assert any(h.get("is_wicket") for h in hits)


def test_wer_and_uptime(tmp_path):
    assert word_error_rate("what is the score", "what is the score") == 0
    url = f"sqlite:///{tmp_path / 'u.db'}"
    engine = init_db(url=url)
    Session = make_session_factory(engine)
    payload = load_json(Path("data/samples/mini_t20.json"))
    with Session() as session:
        persist_flat(session, flatten_match("mini_t20", payload))
    replay = ReplayEngine(Session)
    rs = replay.start("mini_t20", interval_seconds=0)
    report = replay_uptime(replay, rs.session_id)
    assert report["ticks"] == 20
    assert report["uptime"] == 1.0
    card_summary = post_match_summary(rs.state if False else __import__("ascs.replay.state", fromlist=["scorecard_view"]).scorecard_view(rs.state))
    assert "Marina Strikers" in card_summary
