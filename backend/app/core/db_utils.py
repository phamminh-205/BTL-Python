from sqlalchemy import text, inspect
from app.database import engine


def ensure_schema_consistency():
    """Auto-migrate missing columns without breaking existing data."""
    print("Checking database schema consistency...")
    inspector = inspect(engine)

    with engine.begin() as conn:
        # ── reviews table ────────────────────────────────────────
        if inspector.has_table("reviews"):
            review_cols = [c["name"] for c in inspector.get_columns("reviews")]
            if "criteria_scores" not in review_cols:
                print("  Adding 'criteria_scores' to reviews...")
                conn.execute(text("ALTER TABLE reviews ADD COLUMN criteria_scores JSONB DEFAULT NULL"))
            if "reviewed_at" not in review_cols:
                print("  Adding 'reviewed_at' to reviews...")
                conn.execute(text("ALTER TABLE reviews ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL"))

        # ── progress_reports table ───────────────────────────────
        if inspector.has_table("progress_reports"):
            prog_cols = [c["name"] for c in inspector.get_columns("progress_reports")]
            additions = {
                "products_created":  "TEXT DEFAULT NULL",
                "attachment_url":    "VARCHAR(500) DEFAULT NULL",
                "is_overdue":        "BOOLEAN NOT NULL DEFAULT FALSE",
                "reviewed_by":       "UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL",
                "reviewed_at":       "TIMESTAMP WITH TIME ZONE DEFAULT NULL",
                "review_note":       "TEXT DEFAULT NULL",
            }
            for col, ddl in additions.items():
                if col not in prog_cols:
                    print(f"  Adding '{col}' to progress_reports...")
                    conn.execute(text(f"ALTER TABLE progress_reports ADD COLUMN {col} {ddl}"))

            # Ensure status column has correct max length
            # (no-op if already correct — safe to run)

    print("Schema consistency check completed.")
