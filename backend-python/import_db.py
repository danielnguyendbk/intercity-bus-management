import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
import argparse
from pathlib import Path
from sqlalchemy import create_engine, text

def import_sql_dump(db_url: str = None, sql_file: str = None):
    # Resolve database URL
    if not db_url:
        from app.core.config import settings
        db_url = settings.DATABASE_URL
    else:
        if db_url.startswith("mysql://"):
            db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
        if "charset=" not in db_url:
            separator = "&" if "?" in db_url else "?"
            db_url = f"{db_url}{separator}charset=utf8mb4"

    # Resolve SQL dump file
    if not sql_file:
        root_dir = Path(__file__).resolve().parents[1]
        candidate_paths = [
            root_dir / "data_dump.sql",
            Path(__file__).resolve().parent / "data_dump.sql",
            Path("data_dump.sql"),
        ]
        for p in candidate_paths:
            if p.exists():
                sql_file = str(p)
                break

    if not sql_file or not os.path.exists(sql_file):
        print(f"❌ Error: Cannot find data_dump.sql file! Checked candidate paths.")
        sys.exit(1)

    print(f"🚀 Connecting to database...")
    print(f"📦 SQL File: {sql_file}")
    
    connect_args = {}
    if any(h in db_url.lower() for h in ["tidbcloud.com", "aivencloud.com"]):
        connect_args["ssl"] = {}

    engine = create_engine(db_url, connect_args=connect_args)

    with open(sql_file, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Split statements safely
    raw_statements = content.split(";\n")
    print(f"⏳ Executing {len(raw_statements)} statements...")

    with engine.connect() as conn:
        # Disable foreign key checks for clean importing
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        success_count = 0
        error_count = 0

        for stmt in raw_statements:
            clean = stmt.strip()
            # Skip empty or meta comments
            if not clean or clean.startswith("/*") and clean.endswith("*/"):
                continue
            # Remove any line comments at start
            lines = [l for l in clean.splitlines() if not l.strip().startswith("--")]
            clean_stmt = "\n".join(lines).strip()
            if not clean_stmt:
                continue

            try:
                conn.execute(text(clean_stmt))
                success_count += 1
            except Exception as e:
                # Some comments or locks can be safely ignored
                if "LOCK TABLES" in clean_stmt or "UNLOCK TABLES" in clean_stmt:
                    continue
                print(f"⚠️ Statement warning/error: {str(e)[:120]}")
                error_count += 1

        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

    print(f"✅ Import completed successfully!")
    print(f"   Total executed: {success_count} statements ({error_count} ignored/warnings).")

    try:
        from app.core.migrations import ensure_database_schema
        print(f"🔄 Checking and migrating database schema to latest version...")
        ensure_database_schema(engine)
        print(f"✅ Schema is up-to-date!")
    except Exception as e:
        print(f"⚠️ Post-import migration note: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import data_dump.sql to MySQL database")
    parser.add_argument("--url", help="Database connection URL (e.g. mysql+pymysql://user:pass@host:port/db)")
    parser.add_argument("--file", help="Path to data_dump.sql file")
    args = parser.parse_args()

    import_sql_dump(db_url=args.url, sql_file=args.file)
