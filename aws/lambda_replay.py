from __future__ import annotations

import json
import os
from pathlib import Path

import boto3

from ascs.replay.engine import ReplayEngine
from ascs.models import init_db, make_session_factory


def handler(event, context):
    """Emit one delivery for a live replay session (EventBridge every N seconds)."""
    session_id = event.get("session_id") or os.environ["REPLAY_SESSION_ID"]
    engine = init_db(url=os.environ["DATABASE_URL"])
    factory = make_session_factory(engine)
    replay = ReplayEngine(factory)
    # Sessions are process-local; Lambda should load cursor from game_state.
    # For the container scheduler path, prefer the FastAPI /replay/{id}/tick endpoint.
    import httpx

    api = os.environ.get("API_URL", "http://127.0.0.1:8000")
    r = httpx.post(f"{api}/replay/{session_id}/tick", timeout=20)
    r.raise_for_status()
    payload = r.json()
    topic = os.environ.get("SNS_TOPIC_ARN")
    if topic:
        boto3.client("sns").publish(TopicArn=topic, Message=json.dumps(payload, default=str)[:240000])
    return {"statusCode": 200, "body": json.dumps({"ok": True, "done": payload.get("done")})}
