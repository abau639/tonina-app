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
        _migrate_columns(conn)
        conn.commit()
    finally:
        conn.close()

    print(f"Database ready at {db_path}")
    return 0


# Columns added after the first schema version. CREATE TABLE IF NOT EXISTS won't
# add these to an existing table, so we ALTER them in idempotently.
_MIGRATIONS = {
    "jobs": [
        ("equity_offered", "TEXT"),
        ("bonus_text", "TEXT"),
        ("is_remote", "INTEGER NOT NULL DEFAULT 0"),
    ],
}


def _migrate_columns(conn) -> None:
    for table, cols in _MIGRATIONS.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for name, decl in cols:
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")
                print(f"  migrated: added {table}.{name}")


if __name__ == "__main__":
    sys.exit(main())
