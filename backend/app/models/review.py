"""Review model — individual reviewer scores for proposals."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("council_id", "reviewer_id", name="uq_review_per_council"),
        CheckConstraint("score BETWEEN 0 AND 100", name="ck_review_score"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    council_id = Column(UUID(as_uuid=True), ForeignKey("councils.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="RESTRICT"), nullable=False)
    score = Column(Numeric(5, 2), nullable=True)  # 0-100
    comments = Column(Text, nullable=True)
    verdict = Column(String(20), nullable=True)  # PASS, FAIL, NEEDS_REVISION
    status = Column(String(20), nullable=False, default="PENDING", index=True)  # PENDING, SUBMITTED
    criteria_scores = Column(JSON, nullable=True)  # Detailed scores per criterion
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    council = relationship("Council", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews")
    proposal = relationship("Proposal", back_populates="reviews")

    def __repr__(self):
        return f"<Review by {self.reviewer_id} - {self.status}>"
