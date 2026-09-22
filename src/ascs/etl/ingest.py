from __future__ import annotations

import json
import shutil
from pathlib import Path
from zipfile import ZipFile

import httpx

from ascs.config import ROOT, Settings, get_settings

CRICSHEET_T20_JSON = "https://cricsheet.org/downloads/t20s_json.zip"
CRICSHEET_RECENT = "https://cricsheet.org/downloads/recently_added_2_json.zip"


def ingest_local(src: Path, dest_dir: Path | None = None) -> Path:
    settings = get_settings()
    dest_dir = dest_dir or Path(settings.raw_data_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    if src.is_dir():
        copied = []
        for path in src.glob("*.json"):
            target = dest_dir / path.name
            shutil.copy2(path, target)
            copied.append(target)
        return dest_dir
    target = dest_dir / src.name
    shutil.copy2(src, target)
    return target


def download_zip(url: str = CRICSHEET_RECENT, dest_dir: Path | None = None) -> Path:
    settings = get_settings()
    dest_dir = dest_dir or Path(settings.raw_data_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / Path(url).name
    with httpx.Client(follow_redirects=True, timeout=120) as client:
        response = client.get(url)
        response.raise_for_status()
        zip_path.write_bytes(response.content)
    with ZipFile(zip_path) as zf:
        zf.extractall(dest_dir)
    return dest_dir


def upload_raw_to_s3(local_dir: Path, settings: Settings | None = None) -> int:
    settings = settings or get_settings()
    if not settings.s3_bucket:
        return 0
    import boto3

    s3 = boto3.client("s3", region_name=settings.aws_region)
    count = 0
    for path in Path(local_dir).glob("*.json"):
        s3.upload_file(str(path), settings.s3_bucket, f"raw/{path.name}")
        count += 1
    return count


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def match_id_from_path(path: Path) -> str:
    return path.stem
