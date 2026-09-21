"""
AWS Glue-compatible ETL job.

Runs as a Glue Python shell / Spark job when `awsglue` is importable.
Otherwise the same flattening runs locally (pandas + SQLAlchemy).

Job arguments:
  --RAW_S3   s3://bucket/raw/
  --OUT_S3   s3://bucket/parquet/
  --JDBC_URL jdbc:postgresql://host:5432/ascs
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Allow `python etl/glue_job.py` from repo root.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))


def _is_glue() -> bool:
    return "awsglue" in sys.modules or os.environ.get("GLUE_JOB_NAME")


def main() -> None:
    if _is_glue():
        _run_glue()
        return
    from ascs.etl.run import run_etl

    print(run_etl())


def _run_glue() -> None:
    from awsglue.context import GlueContext
    from awsglue.job import Job
    from awsglue.utils import getResolvedOptions
    from pyspark.context import SparkContext

    args = getResolvedOptions(sys.argv, ["JOB_NAME", "RAW_S3", "OUT_S3"])
    sc = SparkContext()
    glue = GlueContext(sc)
    job = Job(glue)
    job.init(args["JOB_NAME"], args)
    spark = glue.spark_session
    raw = spark.read.json(args["RAW_S3"])
    # Flatten on the driver for correctness with nested Cricsheet schema.
    from ascs.etl.flatten import flatten_match

    collected = raw.toJSON().collect()
    matches, deliveries, players, partnerships = [], [], [], []
    for blob in collected:
        payload = json.loads(blob)
        mid = (
            payload.get("info", {}).get("event", {}).get("match_number")
            or payload.get("meta", {}).get("created")
        )
        # Prefer filename-style ids if present in a synthetic `_source` field.
        mid = str(payload.get("_match_id") or mid)
        flat = flatten_match(mid, payload)
        matches.append(flat["match"])
        deliveries.extend(flat["deliveries"])
        players.extend(flat["players"])
        partnerships.extend(flat["partnerships"])
    spark.createDataFrame(matches).write.mode("overwrite").parquet(f"{args['OUT_S3']}/matches/")
    spark.createDataFrame(deliveries).write.mode("overwrite").parquet(f"{args['OUT_S3']}/deliveries/")
    spark.createDataFrame(players).write.mode("overwrite").parquet(f"{args['OUT_S3']}/players/")
    spark.createDataFrame(partnerships).write.mode("overwrite").parquet(f"{args['OUT_S3']}/partnerships/")
    job.commit()


if __name__ == "__main__":
    main()
