FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml requirements.txt README.md /app/
COPY src /app/src
COPY etl /app/etl
COPY streamlit_app /app/streamlit_app
COPY data/samples /app/data/samples
COPY sql /app/sql
COPY eval /app/eval

RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -e .

ENV PYTHONPATH=/app/src
EXPOSE 8000 8501

CMD ["uvicorn", "ascs.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
