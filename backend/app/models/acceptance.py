"""Acceptance dossier and acceptance review models — full module."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class AcceptanceDossier(Base):
    """Hồ sơ nghiệm thu — do giảng viên (PI) nộp."""
    __tablename__ = "acceptance_dossiers"
    __table_args__ = (
        UniqueConstraint("proposal_id", name="uq_acceptance_per_proposal"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="RESTRICT"), nullable=False, index=True)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    # Core dossier content
    final_report = Column(Text, nullable=False)             # Báo cáo tổng kết
    achievements = Column(Text, nullable=False)              # Sản phẩm đạt được
    deliverables = Column(Text, nullable=True)               # Sản phẩm cụ thể (phần mềm, prototype...)
    impact_summary = Column(Text, nullable=True)             # Tóm tắt ứng dụng / tác động
    self_assessment = Column(Text, nullable=True)            # Tự đánh giá
    completion_explanation = Column(Text, nullable=True)     # Giải trình mức độ hoàn thành vs. mục tiêu

    # Related publications (JSON list of publication IDs)
    linked_publication_ids = Column(JSONB, nullable=True, default=list)

    # Attachments metadata (JSON list of {name, url, size_kb, uploaded_at})
    attachments_metadata = Column(JSONB, nullable=True, default=list)

    # Workflow state
    # DRAFT → SUBMITTED → UNDER_REVIEW → REVIEWED → ACCEPTED | FAILED | REVISION_REQUESTED
    status = Column(String(40), nullable=False, default="DRAFT", index=True)
    revision_reason = Column(Text, nullable=True)

    # Final verdict (set by LEADERSHIP)
    # excellent | good | pass | fail | revise_required
    final_verdict = Column(String(30), nullable=True)
    finalized_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    finalize_note = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    proposal = relationship("Proposal", back_populates="acceptance_dossiers")
    submitter = relationship("User", back_populates="acceptance_dossiers_submitted", foreign_keys=[submitted_by])
    finalizer = relationship("User", back_populates="acceptance_dossiers_finalized", foreign_keys=[finalized_by])
    acceptance_reviews = relationship("AcceptanceReview", back_populates="dossier", cascade="all, delete-orphan")
    status_history = relationship("AcceptanceDossierHistory", back_populates="dossier", order_by="AcceptanceDossierHistory.changed_at")

    def __repr__(self):
        return f"<AcceptanceDossier proposal={self.proposal_id} status={self.status}>"


class AcceptanceDossierHistory(Base):
    """Audit log for every dossier state transition."""
    __tablename__ = "acceptance_dossier_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dossier_id = Column(UUID(as_uuid=True), ForeignKey("acceptance_dossiers.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(40), nullable=True)
    to_status = Column(String(40), nullable=False)
    action = Column(String(60), nullable=False)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    dossier = relationship("AcceptanceDossier", back_populates="status_history")
    actor = relationship("User", foreign_keys=[actor_id])

    def __repr__(self):
        return f"<AcceptanceDossierHistory {self.from_status} → {self.to_status}>"


class AcceptanceReview(Base):
    """Đánh giá nghiệm thu từng reviewer trong hội đồng."""
    __tablename__ = "acceptance_reviews"
    __table_args__ = (
        UniqueConstraint("dossier_id", "reviewer_id", name="uq_acceptance_review"),
        CheckConstraint("score BETWEEN 0 AND 100", name="ck_acc_score"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dossier_id = Column(UUID(as_uuid=True), ForeignKey("acceptance_dossiers.id", ondelete="CASCADE"), nullable=False, index=True)
    council_id = Column(UUID(as_uuid=True), ForeignKey("councils.id", ondelete="RESTRICT"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    score = Column(Numeric(5, 2), nullable=True)
    comments = Column(Text, nullable=True)
    # PASS | FAIL | NEEDS_REVISION (individual reviewer verdict)
    verdict = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")   # PENDING | SUBMITTED
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    dossier = relationship("AcceptanceDossier", back_populates="acceptance_reviews")
    council = relationship("Council", back_populates="acceptance_reviews")
    reviewer = relationship("User", back_populates="acceptance_reviews")

    def __repr__(self):
        return f"<AcceptanceReview status={self.status} verdict={self.verdict}>"
