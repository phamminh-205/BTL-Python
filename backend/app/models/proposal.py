"""Proposal model with members and status history tracking."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Numeric, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Proposal(Base):
    __tablename__ = "proposals"
    __table_args__ = (
        UniqueConstraint("title", "period_id", name="uq_proposal_title_period"),
        CheckConstraint("duration_months BETWEEN 1 AND 36", name="ck_duration"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=True)
    objectives = Column(Text, nullable=True)
    methodology = Column(Text, nullable=True)
    expected_outcomes = Column(Text, nullable=True)
    duration_months = Column(Integer, nullable=True)
    budget_estimated = Column(Numeric(15, 2), nullable=True)  # VND, for future finance module
    attachment_url = Column(String(500), nullable=True)

    # Foreign keys
    pi_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    field_id = Column(UUID(as_uuid=True), ForeignKey("research_fields.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("proposal_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    period_id = Column(UUID(as_uuid=True), ForeignKey("registration_periods.id", ondelete="SET NULL"), nullable=True, index=True)

    # Status lifecycle
    status = Column(String(40), nullable=False, default="DRAFT", index=True)
    revision_reason = Column(Text, nullable=True)

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    principal_investigator = relationship("User", back_populates="proposals_as_pi", foreign_keys=[pi_id])
    department = relationship("Department", back_populates="proposals", foreign_keys=[department_id])
    research_field = relationship("ResearchField", back_populates="proposals")
    category = relationship("ProposalCategory", back_populates="proposals")
    registration_period = relationship("RegistrationPeriod", back_populates="proposals")
    members = relationship("ProposalMember", back_populates="proposal", cascade="all, delete-orphan")
    councils = relationship("Council", back_populates="proposal")
    reviews = relationship("Review", back_populates="proposal")
    approval_history = relationship("ApprovalHistory", back_populates="proposal", order_by="ApprovalHistory.decided_at")
    progress_reports = relationship("ProgressReport", back_populates="proposal", order_by="ProgressReport.report_order")
    acceptance_dossiers = relationship("AcceptanceDossier", back_populates="proposal")
    publications = relationship("Publication", back_populates="proposal")
    status_history = relationship("ProposalStatusHistory", back_populates="proposal", order_by="ProposalStatusHistory.changed_at")

    def __repr__(self):
        return f"<Proposal {self.title[:50]} ({self.status})>"


class ProposalMember(Base):
    """Team members on a proposal (PI recorded separately, co-investigators here)."""
    __tablename__ = "proposal_members"
    __table_args__ = (
        UniqueConstraint("proposal_id", "user_id", name="uq_proposal_member"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_in_proposal = Column(String(30), nullable=False, default="CO_INVESTIGATOR")  # PI, CO_INVESTIGATOR, CONSULTANT
    sort_order = Column(Integer, nullable=False, default=0)

    # Relationships
    proposal = relationship("Proposal", back_populates="members")
    user = relationship("User", back_populates="proposal_memberships")


class ProposalStatusHistory(Base):
    """Audit log for every proposal status transition."""
    __tablename__ = "proposal_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(40), nullable=True)  # NULL for initial creation
    to_status = Column(String(40), nullable=False)
    action = Column(String(50), nullable=False)  # create, submit, validate, approve, etc.
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    proposal = relationship("Proposal", back_populates="status_history")
