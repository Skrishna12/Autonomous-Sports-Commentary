from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

from prometheus_client import Counter, Gauge, Histogram, generate_latest

AGENT_LATENCY = Histogram("ascs_agent_latency_seconds", "Agent latency", ["agent"])
TTS_TTFA = Histogram("ascs_tts_ttfa_seconds", "TTS time to first audio")
TOKENS_PER_OVER = Counter("ascs_tokens_per_over", "Approximate tokens emitted", ["over_key"])
QUESTIONS = Counter("ascs_questions_total", "Viewer questions", ["channel"])
ERRORS = Counter("ascs_errors_total", "System errors", ["component"])
REPLAY_SEQUENCE = Gauge("ascs_replay_sequence", "Current delivery sequence")
COST_PER_MATCH = Gauge("ascs_cost_per_match_usd", "Estimated cloud cost per match replay")


class Metrics:
    def observe_agent(self, agent: str, seconds: float) -> None:
        AGENT_LATENCY.labels(agent=agent).observe(seconds)

    def observe_tts(self, seconds: float) -> None:
        TTS_TTFA.observe(seconds)

    def add_tokens(self, over_key: str, n: int) -> None:
        TOKENS_PER_OVER.labels(over_key=over_key).inc(n)

    def question(self, channel: str) -> None:
        QUESTIONS.labels(channel=channel).inc()

    def error(self, component: str) -> None:
        ERRORS.labels(component=component).inc()

    def set_sequence(self, seq: int) -> None:
        REPLAY_SEQUENCE.set(seq)

    def set_cost(self, usd: float) -> None:
        COST_PER_MATCH.set(usd)

    def export(self) -> bytes:
        return generate_latest()


metrics = Metrics()


def timed(agent: str):
    def wrap(fn):
        def inner(*args, **kwargs):
            start = time.perf_counter()
            try:
                return fn(*args, **kwargs)
            except Exception:
                metrics.error(agent)
                raise
            finally:
                metrics.observe_agent(agent, time.perf_counter() - start)

        return inner

    return wrap


def estimate_cost_per_match(deliveries: int, interval_s: float, tts_seconds: float) -> dict[str, Any]:
    """Free-tier oriented cost model for the final report."""
    hours = (deliveries * interval_s) / 3600
    ec2_t3_micro = hours * 0.0104  # on-demand us-east-1 approx
    ebs = 0.08 / 30 * max(hours / 24, 1 / 24)
    rds_free = 0.0
    s3 = 0.001
    total = round(ec2_t3_micro + ebs + rds_free + s3, 4)
    return {
        "deliveries": deliveries,
        "replay_hours": round(hours, 3),
        "ec2_usd": round(ec2_t3_micro, 4),
        "total_usd": total,
        "note": "Assumes t3.micro free-tier eligible hours already consumed; shut down when idle.",
    }
