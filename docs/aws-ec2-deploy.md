# EC2 deployment

Final demo is intended to run on this Docker Compose stack on an EC2 instance, not only on a laptop.

## Free-tier notes
- Prefer `t3.micro` / `t2.micro` in a free-tier region.
- RDS Postgres `db.t3.micro` if you need a separate database; otherwise Postgres in Compose on the instance is enough for the demo.
- S3 for raw JSON + Parquet. Glue job: `etl/glue_job.py`.
- Stop / terminate the instance when you are not demonstrating. Hours are the main cost.

## Steps
1. Open ports 22, 8000, 8501, 3000 (Grafana) on a security group. Restrict SSH to your IP.
2. Clone this repo on the instance.
3. `cp .env.example .env` and set `DATABASE_URL` to the Compose Postgres URL (already in `docker-compose.yml`).
4. Run `bash aws/deploy_ec2.sh`.
5. Bootstrap data: `docker compose exec api python -m ascs.cli bootstrap`.
6. Open Streamlit at `http://<public-ip>:8501`.
7. Grafana at `http://<public-ip>:3000` (admin / admin — change immediately).
8. Optional: schedule `aws/lambda_replay.py` against `/replay/{id}/tick` if you want Lambda as the ticker instead of the in-process loop.

## CloudFormation
`aws/cloudformation.yaml` creates a demo instance + S3 bucket. It does not store secrets.

## Secrets
Export `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `CURSOR_API_KEY` / LLM keys in the environment or an instance role. Never commit them.
