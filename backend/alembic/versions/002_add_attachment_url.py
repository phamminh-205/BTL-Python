"""add attachment_url

Revision ID: 002_add_attachment
Revises: 001_initial
Create Date: 2026-04-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002_add_attachment"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("proposals", sa.Column("attachment_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("proposals", "attachment_url")
