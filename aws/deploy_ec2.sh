#!/usr/bin/env bash
# EC2 user-data / deploy helper. Run on Amazon Linux 2023 / Ubuntu 22.04.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v docker compose >/dev/null; then
  echo "Install Docker Compose v2, then re-run."
  exit 1
fi

cp -n .env.example .env || true
# Point the API at compose Postgres
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql+psycopg2://ascs:ascs@postgres:5432/ascs|' .env || true

docker compose up -d --build
sleep 8
docker compose exec -T api python -m ascs.cli bootstrap
echo "Streamlit: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo localhost):8501"
echo "Grafana:   http://HOST:3000  (admin/admin) — change the password"
echo "API:       http://HOST:8000/docs"
echo "Remember to stop the instance when idle."
