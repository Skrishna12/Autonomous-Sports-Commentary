FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml requirements.txt /app/
COPY src /app/src
COPY services /app/services
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -e . && pip install --no-cache-dir faster-whisper || true
ENV PYTHONPATH=/app/src
EXPOSE 8002
CMD ["uvicorn", "services.asr.app:app", "--host", "0.0.0.0", "--port", "8002"]
