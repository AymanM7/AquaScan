"""add gemini_analysis_text to cv_results

Revision ID: a1b2c3d4e5f6
Revises: 5712fbf55610
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "5712fbf55610"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("cv_results", sa.Column("gemini_analysis_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("cv_results", "gemini_analysis_text")
