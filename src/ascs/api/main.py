from __future__ import annotations

import threading
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from ascs.agents.graph import CommentarySupervisor
from ascs.agents.personas import PERSONAS
from ascs.config import get_settings
from ascs.eval.judge import judge_commentary, log_mlflow
from ascs.eval.metrics import estimate_cost_per_match, metrics
from ascs.models import CommentaryLine, Match, QATurn, init_db, make_session_factory
from ascs.replay.engine import ReplayEngine
from ascs.replay.state import scorecard_view
from ascs.speech.pipeline import synthesize, transcribe

settings = get_settings()
engine = init_db()
SessionLocal = make_session_factory(engine)
_lock = threading.Lock()
_replays: dict[str, ReplayEngine] = {}
_threads: dict[str, threading.Thread] = {}


def _get_engine() -> ReplayEngine:
    key = "default"
    if key in _replays:
        return _replays[key]

    def on_event(delivery, state):
        session_id = state.get("session_id")
        db = SessionLocal()
        try:
            supervisor = CommentarySupervisor(db)
            result = supervisor.invoke(
                {
                    "event": delivery,
                    "game_state": state,
                    "language": settings.default_language,
                }
            )
            eng = _replays[key]
            sess = eng.sessions.get(session_id) if session_id else None
            if sess is None:
                for candidate in eng.sessions.values():
                    if candidate.match_id == delivery["match_id"] and candidate.state.get("sequence") == delivery["sequence"]:
                        sess = candidate
                        break
            if sess is None:
                return
            t0 = time.perf_counter()
            audio = synthesize(result.get("pbp_text") or "", result.get("speaker_pbp") or "River Hale", settings.default_language)
            metrics.observe_tts(time.perf_counter() - t0)
            judged = judge_commentary(delivery, result.get("pbp_text") or "")
            lines = [
                {
                    "speaker": result.get("speaker_pbp"),
                    "text": result.get("pbp_text"),
                    "audio_path": audio["path"],
                    "judge": judged,
                }
            ]
            if result.get("analyst_text"):
                a_audio = synthesize(result["analyst_text"], result.get("speaker_analyst") or "Nia Voss", settings.default_language)
                lines.append(
                    {
                        "speaker": result.get("speaker_analyst"),
                        "text": result["analyst_text"],
                        "audio_path": a_audio["path"],
                        "judge": judge_commentary(delivery, result["analyst_text"]),
                    }
                )
            sess.commentary.extend(lines)
            for ln in lines:
                db.add(
                    CommentaryLine(
                        session_id=sess.session_id,
                        match_id=sess.match_id,
                        sequence=delivery["sequence"],
                        speaker=ln["speaker"],
                        language=settings.default_language,
                        text=ln["text"],
                        audio_path=ln["audio_path"],
                        judge_accuracy=ln["judge"]["accuracy"],
                        judge_fluency=ln["judge"]["fluency"],
                        judge_excitement=ln["judge"]["excitement"],
                        prompt_version=ln["judge"]["prompt_version"],
                        model_name=result.get("model_name"),
                        latency_ms=1000 * (time.perf_counter() - t0),
                    )
                )
            db.commit()
            metrics.set_sequence(delivery["sequence"])
            metrics.add_tokens(f"{delivery['innings']}.{delivery['over']}", len((result.get("pbp_text") or "").split()))
            log_mlflow(
                {"accuracy": judged["accuracy"], "fluency": judged["fluency"], "excitement": judged["excitement"]},
                {"prompt_version": judged["prompt_version"], "model": result.get("model_name")},
            )
        except Exception:
            metrics.error("commentary")
            db.rollback()
        finally:
            db.close()

    _replays[key] = ReplayEngine(SessionLocal, on_event=on_event)
    return _replays[key]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Autonomous Sports Commentary System", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class StartReplay(BaseModel):
    match_id: str
    interval_seconds: float = 3.0
    language: str = "en"


class QuestionIn(BaseModel):
    session_id: str
    question: str
    language: str = "en"


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/matches")
def matches():
    db = SessionLocal()
    try:
        rows = db.query(Match).all()
        return [
            {
                "match_id": m.match_id,
                "teams": m.teams,
                "venue": m.venue,
                "match_type": m.match_type,
                "dates": m.dates,
                "outcome": m.outcome,
            }
            for m in rows
        ]
    finally:
        db.close()


@app.get("/personas")
def personas():
    return PERSONAS


@app.post("/replay/start")
def start_replay(body: StartReplay):
    db = SessionLocal()
    try:
        eng = _get_engine()
        rs = eng.start(body.match_id, interval_seconds=body.interval_seconds)
        settings.default_language = body.language  # type: ignore[misc]

        def loop(session_id: str):
            e = _get_engine()
            for _ in e.run_all(session_id, sleep=True):
                pass

        t = threading.Thread(target=loop, args=(rs.session_id,), daemon=True)
        _threads[rs.session_id] = t
        t.start()
        return {"session_id": rs.session_id, "match_id": rs.match_id, "deliveries": len(rs.deliveries)}
    finally:
        db.close()


@app.post("/replay/{session_id}/pause")
def pause(session_id: str, paused: bool = True):
    db = SessionLocal()
    try:
        _get_engine().pause(session_id, paused)
        return {"session_id": session_id, "paused": paused}
    except KeyError:
        raise HTTPException(404, "unknown session")
    finally:
        db.close()


@app.post("/replay/{session_id}/tick")
def tick(session_id: str):
    db = SessionLocal()
    try:
        event = _get_engine().tick(session_id)
        if event is None:
            return {"done": True}
        return event
    except KeyError:
        raise HTTPException(404, "unknown session")
    finally:
        db.close()


@app.get("/replay/{session_id}/state")
def live_state(session_id: str):
    db = SessionLocal()
    try:
        rs = _get_engine().sessions.get(session_id)
        if not rs:
            raise HTTPException(404, "unknown session")
        return {
            "session_id": session_id,
            "done": rs.done,
            "paused": rs.paused,
            "cursor": rs.cursor,
            "total": len(rs.deliveries),
            "scorecard": scorecard_view(rs.state),
            "commentary": rs.commentary[-40:],
        }
    finally:
        db.close()


@app.post("/qa")
def qa(body: QuestionIn):
    t0 = time.perf_counter()
    metrics.question("text")
    db = SessionLocal()
    try:
        eng = _get_engine()
        rs = eng.sessions.get(body.session_id)
        if not rs:
            raise HTTPException(404, "unknown session")
        supervisor = CommentarySupervisor(db)
        result = supervisor.invoke(
            {
                "question": body.question,
                "game_state": rs.state,
                "event": rs.state.get("last_delivery") or {},
                "language": body.language,
            }
        )
        answer = result.get("qa_answer") or ""
        audio = synthesize(answer, "Nia Voss", body.language)
        db.add(
            QATurn(
                session_id=body.session_id,
                match_id=rs.match_id,
                question=body.question,
                answer=answer,
                language=body.language,
                via_voice=False,
                latency_ms=1000 * (time.perf_counter() - t0),
            )
        )
        db.commit()
        return {"answer": answer, "audio_path": audio["path"], "latency_ms": 1000 * (time.perf_counter() - t0)}
    finally:
        db.close()


@app.post("/qa/voice")
async def qa_voice(session_id: str, language: str = "en", file: UploadFile = File(...)):
    t0 = time.perf_counter()
    metrics.question("voice")
    audio_bytes = await file.read()
    asr = transcribe(audio_bytes, file.filename or "q.wav")
    question = asr.get("text") or ""
    if not question:
        return {"asr": asr, "answer": "I could not transcribe that. Type the question or enable faster-whisper."}
    result = qa(QuestionIn(session_id=session_id, question=question, language=language))
    result["asr"] = asr
    result["latency_ms"] = 1000 * (time.perf_counter() - t0)
    return result


@app.get("/audio")
def audio(path: str):
    from pathlib import Path

    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "audio missing")
    return Response(p.read_bytes(), media_type="audio/wav")


@app.get("/metrics")
def prom_metrics():
    return Response(metrics.export(), media_type="text/plain; version=0.0.4")


@app.get("/cost/{match_id}")
def cost(match_id: str, interval: float = 3.0):
    db = SessionLocal()
    try:
        from ascs.models import Delivery

        n = db.query(Delivery).filter_by(match_id=match_id).count()
        est = estimate_cost_per_match(n, interval, tts_seconds=n * 1.5)
        metrics.set_cost(est["total_usd"])
        return est
    finally:
        db.close()
