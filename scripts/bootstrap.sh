#!/usr/bin/env bash
set -euo pipefail
python -m pip install -e ".[dev]" -r requirements.txt
python -m ascs.cli bootstrap
pytest
echo "API:    uvicorn ascs.api.main:app --reload"
echo "UI:     STREAMLIT_API_URL=http://127.0.0.1:8000 streamlit run streamlit_app/app.py"
