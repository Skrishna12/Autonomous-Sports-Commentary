"""Local ETL entrypoint. Same flattening as the Glue job."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ascs.config import get_settings
from ascs.etl.flatten import flatten_match, persist_flat
from ascs.etl.ingest import load_json, match_id_from_path
from ascs.models import init_db, make_session_factory


def run_etl(raw_dir: str | Path | None = None, parquet_dir: str | Path | None = None) -> dict[str, int]:
    settings = get_settings()
    raw_dir = Path(raw_dir or settings.raw_data_dir)
    parquet_dir = Path(parquet_dir or settings.parquet_dir)
    parquet_dir.mkdir(parents=True, exist_ok=True)
    engine = init_db()
    Session = make_session_factory(engine)
    matches = deliveries = players = partnerships = 0
    match_rows, delivery_rows, player_rows, partnership_rows = [], [], [], []
    with Session() as session:
        for path in sorted(raw_dir.glob("*.json")):
            payload = load_json(path)
            mid = match_id_from_path(path)
            flat = flatten_match(mid, payload, source_path=str(path))
            persist_flat(session, flat)
            matches += 1
            deliveries += len(flat["deliveries"])
            players += len(flat["players"])
            partnerships += len(flat["partnerships"])
            match_rows.append(flat["match"])
            delivery_rows.extend(flat["deliveries"])
            player_rows.extend(flat["players"])
            partnership_rows.extend(flat["partnerships"])
    if match_rows:
        pd.DataFrame(match_rows).to_parquet(parquet_dir / "matches.parquet", index=False)
        pd.DataFrame(delivery_rows).to_parquet(parquet_dir / "deliveries.parquet", index=False)
        pd.DataFrame(player_rows).to_parquet(parquet_dir / "players.parquet", index=False)
        pd.DataFrame(partnership_rows).to_parquet(parquet_dir / "partnerships.parquet", index=False)
    return {
        "matches": matches,
        "deliveries": deliveries,
        "players": players,
        "partnerships": partnerships,
    }


if __name__ == "__main__":
    print(run_etl())
