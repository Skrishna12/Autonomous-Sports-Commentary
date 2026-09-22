#!/usr/bin/env python3
"""Run evaluation suite and print a metrics table for the final report."""

from __future__ import annotations

import json
import time
from pathlib import Path

from ascs.agents.graph import CommentarySupervisor
from ascs.config import ROOT
from ascs.eval.judge import judge_commentary, log_mlflow
from ascs.eval.metrics import estimate_cost_per_match
from ascs.eval.qa_eval import run_qa_eval
from ascs.etl.flatten import flatten_match, persist_flat
from ascs.etl.ingest import load_json
from ascs.models import init_db, make_session_factory
from ascs.replay.state import apply_delivery, initial_state
from ascs.speech.pipeline import synthesize


def main() -> None:
    path = ROOT / "data" / "samples" / "mini_t20.json"
    payload = load_json(path)
    engine = init_db()
    Session = make_session_factory(engine)
    with Session() as session:
        persist_flat(session, flatten_match("mini_t20", payload, str(path)))
        qa = run_qa_eval(session, "mini_t20")
    flat = flatten_match("mini_t20", payload)
    state = initial_state(flat["match"])
    supervisor = CommentarySupervisor()
    acc, flu, exc, latencies = [], [], [], []
    for d in flat["deliveries"]:
        state = apply_delivery(state, d)
        t0 = time.perf_counter()
        out = supervisor.invoke({"event": d, "game_state": state, "language": "en"})
        tts_t0 = time.perf_counter()
        synthesize(out["pbp_text"], out.get("speaker_pbp") or "River Hale", "en")
        ttfa = time.perf_counter() - tts_t0
        e2e = time.perf_counter() - t0
        judged = judge_commentary(d, out["pbp_text"])
        acc.append(judged["accuracy"])
        flu.append(judged["fluency"])
        exc.append(judged["excitement"])
        latencies.append({"e2e": e2e, "ttfa": ttfa})
        log_mlflow(
            {"accuracy": judged["accuracy"], "fluency": judged["fluency"], "excitement": judged["excitement"]},
            {"prompt_version": judged["prompt_version"], "model": out.get("model_name")},
        )
    report = {
        "commentary_factual_accuracy": sum(acc) / len(acc),
        "judge_fluency": sum(flu) / len(flu),
        "judge_excitement": sum(exc) / len(exc),
        "qa_accuracy_50": qa["accuracy"],
        "mean_event_to_audio_s": sum(x["e2e"] for x in latencies) / len(latencies),
        "mean_tts_ttfa_s": sum(x["ttfa"] for x in latencies) / len(latencies),
        "cost": estimate_cost_per_match(len(flat["deliveries"]), 3.0, 1.5 * len(flat["deliveries"])),
        "targets": {
            "accuracy": 0.95,
            "judge_quality": 4.0,
            "qa": 0.85,
            "event_to_audio_s": 5.0,
            "voice_qa_s": 6.0,
        },
    }
    out_path = ROOT / "eval" / "last_report.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
