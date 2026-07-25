#!/usr/bin/env python3
"""Initialize the SQLite jobs database from schema.sql. Idempotent — safe to re-run."""

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "schema.sql"
DEFAULT_DB = REPO_ROOT / "jobs.db"


def main():
    import sqlite3

    db_path = Path(os.environ.get("JOBS_DB_PATH", DEFAULT_DB))
    db_path.parent.mkdir(parents=True, exist_ok=True)

    schema = SCHEMA_PATH.read_text()
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()

    print(f"Database ready at {db_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
