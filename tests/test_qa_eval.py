from pathlib import Path

from ascs.eval.qa_eval import grade_answer, run_qa_eval
from ascs.etl.flatten import flatten_match, persist_flat
from ascs.etl.ingest import load_json
from ascs.models import init_db, make_session_factory


def test_qa_accuracy_on_mini_match(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 't.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    engine = init_db(url=url)
    Session = make_session_factory(engine)
    payload = load_json(Path("data/samples/mini_t20.json"))
    flat = flatten_match("mini_t20", payload)
    with Session() as session:
        persist_flat(session, flat)
        report = run_qa_eval(session, "mini_t20")
    assert report["n"] == 50
    assert report["accuracy"] >= 0.85


def test_grade_answer():
    assert grade_answer("Marina Strikers are 23/1 after 2.0 overs.", ["23", "1"])
    assert not grade_answer("unknown", ["23"])
