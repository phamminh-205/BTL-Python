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

        # ── acceptance_dossiers table ────────────────────────────
        if inspector.has_table("acceptance_dossiers"):
            acc_cols = [c["name"] for c in inspector.get_columns("acceptance_dossiers")]
            acc_additions = {
                "impact_summary":            "TEXT DEFAULT NULL",
                "self_assessment":           "TEXT DEFAULT NULL",
                "completion_explanation":    "TEXT DEFAULT NULL",
                "linked_publication_ids":    "JSONB DEFAULT NULL",
                "attachments_metadata":      "JSONB DEFAULT NULL",
                "final_verdict":             "VARCHAR(30) DEFAULT NULL",
                "finalized_by":              "UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL",
                "finalized_at":              "TIMESTAMP WITH TIME ZONE DEFAULT NULL",
                "finalize_note":             "TEXT DEFAULT NULL",
                "created_at":               "TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
                "submitted_at":             "TIMESTAMP WITH TIME ZONE DEFAULT NULL",
            }
            for col, ddl in acc_additions.items():
                if col not in acc_cols:
                    print(f"  Adding '{col}' to acceptance_dossiers...")
                    conn.execute(text(f"ALTER TABLE acceptance_dossiers ADD COLUMN {col} {ddl}"))

            # Ensure status allows new values (widen to VARCHAR(40))
            conn.execute(text(
                "ALTER TABLE acceptance_dossiers ALTER COLUMN status TYPE VARCHAR(40)"
            ))
            # Add null-ability to submitted_at if needed
            try:
                conn.execute(text(
                    "ALTER TABLE acceptance_dossiers ALTER COLUMN submitted_at DROP NOT NULL"
                ))
            except Exception:
                pass

        # ── acceptance_dossier_history table ─────────────────────
        if not inspector.has_table("acceptance_dossier_history"):
            print("  Creating 'acceptance_dossier_history' table...")
            conn.execute(text("""
                CREATE TABLE acceptance_dossier_history (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    dossier_id UUID NOT NULL REFERENCES acceptance_dossiers(id) ON DELETE CASCADE,
                    from_status VARCHAR(40),
                    to_status VARCHAR(40) NOT NULL,
                    action VARCHAR(60) NOT NULL,
                    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    note TEXT,
                    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_acc_hist_dossier ON acceptance_dossier_history(dossier_id)"
            ))

    print("Schema consistency check completed.")
