# Final report — Autonomous Sports Commentary System

## What was built
A reproducible cricket platform that:
- ingests Cricsheet ball-by-ball JSON
- flattens it into matches, deliveries, players, partnerships (Postgres + Parquet)
- replays a match live
- generates two-voice commentary (play-by-play + analyst) grounded in the event
- answers viewer questions from game state / SQL tools (text or voice)
- speaks lines with TTS (Kokoro/Indic when installed; synthetic WAV otherwise)
- exposes Streamlit + FastAPI, MLflow, Prometheus, and Grafana
- deploys as Docker Compose on EC2

## Metrics (run `python eval/run_eval.py`)
Targets from the brief:
- Commentary factual accuracy ≥ 95% (template agents are event-grounded; hallucinated stats are errors)
- Judge fluency/excitement ≥ 4 / 5 (heuristic judge always; LLM-as-judge when `LLM_BASE_URL` is set)
- Q&A accuracy ≥ 85% on a 50-question generated set
- Event → audio ≤ 5 s; voice Q&A ≤ 6 s on a warm CPU with synthetic TTS
- ASR WER: measure with faster-whisper enabled (`ASR_ENGINE=faster-whisper`)
- Uptime: Compose healthchecks + Grafana error rate over a full replay

## Limitations
- Default TTS is a placeholder waveform so the stack runs without GPU weights. Enable Kokoro / Indic Parler-TTS for production speech quality.
- Default agents are grounded templates. Point `LLM_BASE_URL` at Qwen3 (Ollama/vLLM) for richer language; keep the judge gate on accuracy.
- Regional Indic TTS quality depends on Parler-TTS weights being present on the EC2 box.
- Glue/Lambda/RDS are provided as scripts; the graded demo path is Compose on one EC2 instance.

## Next steps
- Turn on Kokoro + faster-whisper on a GPU instance
- Optional LoRA (see `notebooks/lora_finetune.md`) only after the core path is green
- Optional VLM on self-recorded footage (not required)

## Compliance
- Original personas only
- Cricsheet events; SoccerNet-Echoes only if/when fine-tuning
- Secrets via environment variables
