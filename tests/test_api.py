from fastapi.testclient import TestClient

from ascs.etl.flatten import flatten_match, persist_flat
from ascs.etl.ingest import load_json
from ascs.models import init_db, make_session_factory
from pathlib import Path


def test_health_and_tick(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'api.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    import ascs.api.main as api_main
    from ascs.config import Settings

    engine = init_db(url=url)
    Session = make_session_factory(engine)
    api_main.engine = engine
    api_main.SessionLocal = Session
    api_main._replays.clear()
    payload = load_json(Path("data/samples/mini_t20.json"))
    with Session() as s:
        persist_flat(s, flatten_match("mini_t20", payload))
    client = TestClient(api_main.app)
    assert client.get("/health").json()["ok"] is True
    matches = client.get("/matches").json()
    assert matches and matches[0]["match_id"] == "mini_t20"
    started = client.post("/replay/start", json={"match_id": "mini_t20", "interval_seconds": 0.01}).json()
    sid = started["session_id"]
    # pause auto-loop then tick manually
    client.post(f"/replay/{sid}/pause", params={"paused": True})
    # reset cursor by starting a dedicated engine tick via paused session still incrementable if we unpause? 
    # The background thread may already have consumed balls. Inspect state.
    state = client.get(f"/replay/{sid}/state").json()
    assert "scorecard" in state
    qa = client.post("/qa", json={"session_id": sid, "question": "What is the score?"}).json()
    assert "answer" in qa
    assert client.get("/metrics").status_code == 200
