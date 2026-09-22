from __future__ import annotations

import time
from typing import Any

from ascs.eval.metrics import metrics
from ascs.replay.engine import ReplayEngine


def replay_uptime(engine: ReplayEngine, session_id: str) -> dict[str, Any]:
    errors = 0
    ticks = 0
    t0 = time.perf_counter()
    rs = engine.sessions[session_id]
    rs.paused = False
    while not rs.done:
        try:
            event = engine.tick(session_id)
            ticks += 1
            if event is None:
                break
        except Exception:
            errors += 1
            metrics.error("replay")
            break
    elapsed = time.perf_counter() - t0
    return {
        "ticks": ticks,
        "errors": errors,
        "error_rate": errors / max(ticks, 1),
        "elapsed_s": elapsed,
        "uptime": 1.0 - (errors / max(ticks, 1)),
    }
