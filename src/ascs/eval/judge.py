from __future__ import annotations

import re
from typing import Any

from ascs.agents.personas import PROMPT_VERSION


def extract_numbers(text: str) -> set[int]:
    return {int(n) for n in re.findall(r"\b\d+\b", text)}


def factual_accuracy(event: dict[str, Any], commentary: str) -> float:
    """1.0 if commentary is grounded in the delivery; else 0.0 / partial."""
    text = commentary.lower()
    checks = []
    batter = (event.get("batter") or "").lower()
    bowler = (event.get("bowler") or "").lower()
    checks.append(batter.split()[-1] in text if batter else True)
    checks.append(bowler.split()[-1] in text if bowler else True)
    if event.get("is_wicket"):
        out = (event.get("player_out") or event.get("batter") or "").lower()
        checks.append(out.split()[-1] in text)
        kind = (event.get("wicket_kind") or "").lower()
        if kind:
            checks.append(kind.split()[0] in text or "out" in text or "विकेट" in commentary or "விக்கெட்" in commentary)
    allowed_numbers = {
        int(event.get("runs_total") or 0),
        int(event.get("runs_batter") or 0),
        int(event.get("runs_extras") or 0),
    }
    actual = event.get("actual_delivery") or ""
    if "." in actual:
        over_s, ball_s = actual.split(".", 1)
        if over_s.isdigit():
            allowed_numbers.add(int(over_s))
        if ball_s.isdigit():
            allowed_numbers.add(int(ball_s))
    mentioned = extract_numbers(commentary)
    hallucinated = mentioned - allowed_numbers
    # Over/ball labels like 0.3 are allowed; ignore 0
    hallucinated.discard(0)
    checks.append(len(hallucinated) == 0)
    return round(sum(1 for c in checks if c) / max(len(checks), 1), 3)


def heuristic_fluency(text: str) -> float:
    words = text.split()
    if len(words) < 4:
        return 2.0
    if len(words) > 80:
        return 3.0
    if text.endswith((".", "!", "।")):
        return 4.5
    return 4.0


def heuristic_excitement(event: dict[str, Any], text: str) -> float:
    score = 4.0
    if event.get("is_wicket") or event.get("is_boundary") or int(event.get("runs_batter") or 0) in {4, 6}:
        score = 4.5
        if any(w in text.lower() for w in ("six", "four", "wicket", "gone", "छक्का", "चौका", "சிக்ஸ்")):
            score = 4.7
    return score


def judge_commentary(event: dict[str, Any], text: str, use_llm: bool = False) -> dict[str, Any]:
    accuracy = factual_accuracy(event, text)
    fluency = heuristic_fluency(text)
    excitement = heuristic_excitement(event, text)
    if use_llm:
        llm = _llm_judge(event, text)
        if llm:
            fluency = llm.get("fluency", fluency)
            excitement = llm.get("excitement", excitement)
            accuracy = llm.get("accuracy", accuracy)
    quality = round((fluency + excitement) / 2, 3)
    return {
        "accuracy": accuracy,
        "fluency": fluency,
        "excitement": excitement,
        "quality": quality,
        "prompt_version": PROMPT_VERSION,
        "accurate_bool": accuracy >= 0.95,
    }


def _llm_judge(event: dict[str, Any], text: str) -> dict[str, Any] | None:
    from ascs.config import get_settings

    settings = get_settings()
    if not settings.llm_base_url:
        return None
    prompt = (
        "Score cricket commentary 1-5 for fluency and excitement, and 0-1 accuracy vs EVENT. "
        "Return JSON {\"accuracy\":0-1,\"fluency\":1-5,\"excitement\":1-5}.\n"
        f"EVENT={event}\nTEXT={text}"
    )
    try:
        import json
        import httpx

        headers = {}
        if settings.llm_api_key:
            headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        r = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            json={"model": settings.judge_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0},
            headers=headers,
            timeout=30,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
        start, end = content.find("{"), content.rfind("}")
        return json.loads(content[start : end + 1])
    except Exception:
        return None


def log_mlflow(metrics: dict[str, Any], params: dict[str, Any] | None = None) -> None:
    try:
        import mlflow
        from ascs.config import get_settings

        settings = get_settings()
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment)
        with mlflow.start_run():
            for k, v in (params or {}).items():
                mlflow.log_param(k, v)
            for k, v in metrics.items():
                if isinstance(v, (int, float)):
                    mlflow.log_metric(k, float(v))
    except Exception:
        return
