from __future__ import annotations

import argparse
import json
from pathlib import Path

from ascs.config import ROOT, get_settings
from ascs.etl.ingest import ingest_local
from ascs.etl.run import run_etl
from ascs.models import Match, init_db, make_session_factory


def cmd_ingest(args: argparse.Namespace) -> None:
    src = Path(args.path)
    dest = ingest_local(src)
    print(f"Ingested {src} -> {dest}")


def cmd_etl(_: argparse.Namespace) -> None:
    print(json.dumps(run_etl(), indent=2))


def cmd_initdb(_: argparse.Namespace) -> None:
    init_db()
    print("Database schema created at", get_settings().database_url)


def cmd_matches(_: argparse.Namespace) -> None:
    init_db()
    Session = make_session_factory()
    with Session() as s:
        rows = s.query(Match).all()
        for m in rows:
            print(m.match_id, m.teams, m.match_type, m.venue)


def cmd_bootstrap(_: argparse.Namespace) -> None:
    samples = ROOT / "data" / "samples"
    ingest_local(samples / "mini_t20.json")
    ingest_local(samples / "1534209.json")
    print(json.dumps(run_etl(), indent=2))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="ascs")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("ingest")
    p.add_argument("path")
    p.set_defaults(func=cmd_ingest)
    sub.add_parser("etl").set_defaults(func=cmd_etl)
    sub.add_parser("initdb").set_defaults(func=cmd_initdb)
    sub.add_parser("matches").set_defaults(func=cmd_matches)
    sub.add_parser("bootstrap").set_defaults(func=cmd_bootstrap)
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
