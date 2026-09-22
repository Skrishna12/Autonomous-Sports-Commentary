# Requirements traceability

Status vs the project PDF. Optional stretch is listed separately and is **not** required until the core path is green on EC2.

| Requirement | Status | Evidence |
| --- | --- | --- |
| Cricsheet ingest | Done (local); S3 upload when `S3_BUCKET` set | `src/ascs/etl/ingest.py` |
| Glue ETL flatten + Parquet + RDS schema | Code done; Glue/RDS run needs your AWS account | `etl/glue_job.py`, `sql/schema.sql` |
| Replay every N seconds + game state | Done | `src/ascs/replay/` |
| LangGraph supervisor PBP + analyst + Q&A | Done (grounded templates; Qwen3 if `LLM_BASE_URL`) | `src/ascs/agents/graph.py` |
| MCP-style SQL tools | Done | `src/ascs/mcp/server.py`, `tools.py` |
| RAG over deliveries | Done | `src/ascs/agents/rag.py` |
| Kokoro English TTS | Hook present; default is synthetic WAV without GPU weights | `src/ascs/speech/pipeline.py` |
| Indic Parler-TTS Hindi/Tamil | Hook + espeak-ng fallback; Parler weights not bundled | same |
| faster-whisper ASR | Docker/service + code; default `ASR_ENGINE=disabled` | `services/asr/` |
| Streamlit scorecard, feed, audio, text+mic | Done | `streamlit_app/app.py` |
| Highlights + post-match spoken summary | Done | `/replay/{id}/highlights` |
| LLM-as-judge + MLflow | Heuristic judge always; LLM judge when `LLM_BASE_URL`; MLflow logger | `src/ascs/eval/judge.py` |
| Prompt versioning | Done | `prompt_versions` table, seeded on bootstrap |
| Docker Compose FastAPI/Streamlit/TTS/Whisper/MLflow/Prom/Grafana | Compose file done | `docker-compose.yml` |
| Prometheus metrics listed in brief | Done | `src/ascs/eval/metrics.py` |
| Grafana dashboard + alerts | Done | `monitoring/` |
| EC2 deploy notes | Docs/scripts done | `docs/aws-ec2-deploy.md` |
| **Final demo on running EC2** | **Not done** — needs your AWS login | — |
| Demo video of one full match | **Not done** | Record after EC2 is up |
| Factual accuracy ≥ 95% | Met on mini fixture (100%) | `eval/last_report.json` |
| Judge ≥ 4 | Met on mini fixture | same |
| Q&A ≥ 85% on 50 questions | Met (96%) | same |
| Event→audio ≤ 5s | Met with synthetic TTS | same |
| Voice Q&A ≤ 6s | Path exists; needs Whisper enabled to measure true ASR | `/qa/voice` |
| ASR WER | Metric implemented; real Whisper WER needs ASR on | `src/ascs/eval/wer.py` |
| Uptime over a full replay | Met on mini 20-ball replay (100%) | `src/ascs/eval/uptime.py` |
| Cost per match | Model + Grafana panel | `docs/cost-report.md` |
| Original personas, no cloned voices | Done | `personas.py` |
| No copyrighted commentary scrape | Done | Cricsheet samples only |
| Secrets in env | Done | `.env.example` |
| LoRA / VLM / SageMaker | Optional stretch, deferred | `notebooks/lora_finetune.md` |

**Software/core path:** about **85%** of must-have items.

**Evaluation-ready including AWS live demo + video:** about **70%**. The blockers are running the stack on **your** EC2 (guideline: demo must not be local-only) and capturing the demo video. Kokoro/Whisper/Parler become complete when those weights are installed on that instance.
