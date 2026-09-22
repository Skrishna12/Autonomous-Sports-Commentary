# Cost model

| Component | Demo assumption | USD |
| --- | --- | --- |
| EC2 t3.micro | ~2 hours for a T20 replay + Q&A | ~0.02 if free-tier hours exhausted; $0 if still in free tier |
| EBS gp3 8 GB | pro-rated | < 0.01 / day |
| RDS db.t3.micro | skip; use Compose Postgres | 0 |
| S3 + Glue | small JSON + one Glue run | < 0.05 |
| Data transfer | single viewer | negligible |
| TTS/ASR | on-box synthetic / tiny Whisper | 0 API |

`GET /cost/{match_id}` and `ascs.eval.metrics.estimate_cost_per_match` publish `ascs_cost_per_match_usd` for Grafana.

Shut the EC2 instance down after the live evaluation slot.
