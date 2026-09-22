"""Shared settings. Secrets come from the environment only."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{ROOT / 'data' / 'ascs.db'}"
    replay_interval_seconds: float = 3.0
    default_match_id: str = "1534209"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "qwen3:8b"
    judge_model: str = "qwen3:8b"
    tts_engine: str = "synthetic"
    asr_engine: str = "disabled"
    tts_service_url: str = "http://127.0.0.1:8001"
    asr_service_url: str = "http://127.0.0.1:8002"
    default_language: str = "en"
    raw_data_dir: str = str(ROOT / "data" / "raw")
    parquet_dir: str = str(ROOT / "data" / "parquet")
    s3_bucket: str = ""
    aws_region: str = "us-east-1"
    mlflow_tracking_uri: str = "file:./mlruns"
    mlflow_experiment: str = "commentary-eval"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    streamlit_api_url: str = "http://127.0.0.1:8000"


def get_settings() -> Settings:
    return Settings()
