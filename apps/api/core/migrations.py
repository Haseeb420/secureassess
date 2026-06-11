import re
from pathlib import Path

import psycopg2

from core.config import settings
from core.logging import get_logger

logger = get_logger()

_MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def run_migrations() -> None:
    if not settings.DATABASE_URL:
        logger.warning("DATABASE_URL not set — skipping auto-migrations (run them manually in Supabase SQL Editor)")
        return

    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
    except Exception as exc:
        logger.error("Could not connect to database for migrations", error=str(exc))
        return

    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename  TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    cur.execute("SELECT filename FROM schema_migrations")
    applied = {row[0] for row in cur.fetchall()}

    files = sorted(
        [f for f in _MIGRATIONS_DIR.glob("*.sql") if re.match(r"^\d+_", f.name)],
        key=lambda f: int(f.name.split("_")[0]),
    )

    for f in files:
        if f.name in applied:
            continue
        logger.info("Applying migration: %s", f.name)
        try:
            cur.execute(f.read_text())
            cur.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (f.name,))
            logger.info("Applied migration: %s", f.name)
        except Exception as exc:
            logger.error("Migration failed", migration=f.name, error=str(exc))
            break

    cur.close()
    conn.close()
