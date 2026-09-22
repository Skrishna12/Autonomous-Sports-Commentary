# Autonomous Sports Commentary

Replay any [Cricsheet](https://cricsheet.org) cricket match as if it were live: two original AI commentators, a live stats database, and a Streamlit app where viewers ask questions by **text or voice** and hear spoken answers.

This repository is the full core path from the project brief:

**ETL → replay → agents → speech → Streamlit → deploy → monitor**

See [docs/requirements-traceability.md](docs/requirements-traceability.md) for a requirement-by-requirement score against the project PDF.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the diagram.

| Piece | Location |
| --- | --- |
| Glue-compatible ETL + local flatten | `etl/glue_job.py`, `src/ascs/etl/` |
| RDS / Postgres DDL | `sql/schema.sql` |
| Replay engine + game state | `src/ascs/replay/` |
| LangGraph supervisor (PBP, analyst, Q&A) | `src/ascs/agents/` |
| MCP-style stats tools (stdio) | `src/ascs/mcp/server.py` |
| TTS / ASR | `src/ascs/speech/`, `services/tts`, `services/asr` |
| FastAPI | `src/ascs/api/main.py` |
| Streamlit | `streamlit_app/app.py` |
| MLflow eval | `eval/run_eval.py`, `notebooks/evaluation.ipynb` |
| Prometheus + Grafana | `monitoring/` |
| EC2 / Lambda / CloudFormation | `aws/` |
| 15-day plan | [docs/15-day-plan.md](docs/15-day-plan.md) |
| Cursor SDK follow-on agents | `orchestration/cursor_sdk_15day.py` |

Commentators are original personas (**River Hale**, **Nia Voss**, **Arjun Mehta**, **Kavya Natarajan**). They are not clones of real broadcasters. Commentary is generated from Cricsheet events only.

## Quick start (laptop)

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]" -r requirements.txt
cp .env.example .env
python -m ascs.cli bootstrap
pytest
uvicorn ascs.api.main:app --reload --port 8000
# other terminal
STREAMLIT_API_URL=http://127.0.0.1:8000 streamlit run streamlit_app/app.py
```

`bootstrap` loads `data/samples/mini_t20.json` (tiny academy fixture) and `data/samples/1534209.json` (CPL T20: St Lucia Kings vs Guyana Amazon Warriors).

Ingest more matches:

```bash
python -m ascs.cli ingest data/samples
# or download a Cricsheet zip into data/raw then:
python -m ascs.cli etl
```

## Docker Compose (EC2 demo)

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec api python -m ascs.cli bootstrap
```

| Service | Port |
| --- | --- |
| Streamlit | 8501 |
| FastAPI | 8000 |
| TTS | 8001 |
| ASR | 8002 |
| MLflow | 5000 |
| Prometheus | 9090 |
| Grafana | 3000 (admin / admin — change it) |

Deployment notes: [docs/aws-ec2-deploy.md](docs/aws-ec2-deploy.md). Cost model: [docs/cost-report.md](docs/cost-report.md). Final report: [docs/final-report.md](docs/final-report.md).

## Speech and models

| Need | Default in this repo | Production switch |
| --- | --- | --- |
| English TTS | Deterministic WAV (`TTS_ENGINE=synthetic`) | `TTS_ENGINE=kokoro` with Kokoro weights |
| Hindi / Tamil TTS | Synthetic + script-aware templates | Indic Parler-TTS weights |
| ASR | Disabled (type questions) | `ASR_ENGINE=faster-whisper` |
| LLM | Grounded templates (no hallucinated stats) | `LLM_BASE_URL` → Qwen3 via Ollama/vLLM |

Open-weight / free-tier only. No paid TTS voices.

## Evaluation

```bash
python eval/run_eval.py
```

Targets: commentary factual accuracy ≥ 95%, judge quality ≥ 4/5, Q&A ≥ 85% on 50 questions, event→audio ≤ 5 s, voice Q&A ≤ 6 s.

**Log every prompt/model/judge score to MLflow before changing prompts.**

## Cursor SDK (optional)

The product itself is LangGraph + FastAPI. If you want Cloud Agents to keep working the 15-day calendar (EC2 demo, extra matches, prompt trials), set `CURSOR_API_KEY` and run:

```bash
pip install cursor-sdk
python orchestration/cursor_sdk_15day.py --prompt "Follow docs/15-day-plan.md; do not weaken grounding rules."
```

Always pass `cloud=` (the script does). Skipping it silently starts a **local** agent.

## Guidelines checklist

- Reproducible from this repo (`pytest`, Compose, `ascs.cli bootstrap`)
- Free-tier AWS notes; shut down EC2 when idle
- Secrets only in environment variables
- No copyrighted commentary scraping
- Hallucinated stats count as errors (judge + template agents)

## License
Match JSON in `data/samples` is from Cricsheet (open licence). See `data/samples/CRICSHEET_README.txt`.
