# 15-day build calendar (core path first; stretch only after E2E)

## Days 1–2 — ETL
- Download Cricsheet JSON, land in `data/raw` and optionally S3
- Flatten to matches / deliveries / players / partnerships
- Load SQLite (local) or RDS Postgres
- Write Parquet under `data/parquet`

## Days 3–4 — Replay
- Delivery-by-delivery game state
- Scheduler emits one ball every N seconds
- Persist `game_state` snapshots

## Days 5–7 — Agents
- LangGraph supervisor: play-by-play, analyst, Q&A
- MCP-style SQL tools over the stats DB
- Original personas (River Hale, Nia Voss, Arjun Mehta, Kavya Natarajan)

## Days 8–9 — Speech
- Commentary text → TTS (Kokoro English, Indic Parler-TTS or synthetic fallback)
- Microphone → faster-whisper → Q&A → TTS

## Days 10–11 — Streamlit
- Scorecard, commentary feed, audio, text + voice chat

## Day 12 — Deploy
- Docker Compose on EC2 (`aws/deploy_ec2.sh`)
- Free-tier notes; stop the instance when idle

## Day 13 — Monitor
- Prometheus `/metrics`, Grafana dashboard JSON, alerts via Grafana UI

## Day 14 — Evaluation
- LLM-as-judge + heuristic judge, MLflow
- 50-question Q&A set, latency + cost

## Day 15 — Report + demo
- `docs/final-report.md`, architecture diagram, demo of one match
- Optional LoRA / VLM only if the core path is already green
