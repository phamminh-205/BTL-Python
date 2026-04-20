"""User model — system accounts with FK to roles table."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    department_id = Column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    academic_rank = Column(String(50), nullable=True)
    academic_title = Column(String(50), nullable=True)
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    role_rel = relationship("Role", back_populates="users", lazy="joined")
    department = relationship("Department", back_populates="users")
    proposals_as_pi = relationship("Proposal", back_populates="principal_investigator", foreign_keys="Proposal.pi_id")
    proposal_memberships = relationship("ProposalMember", back_populates="user")
    council_memberships = relationship("CouncilMember", back_populates="user")
    reviews = relationship("Review", back_populates="reviewer")
    progress_reports = relationship("ProgressReport", back_populates="submitted_by_user", foreign_keys="ProgressReport.submitted_by")
    approval_decisions = relationship("ApprovalHistory", back_populates="decided_by_user")
    acceptance_reviews = relationship("AcceptanceReview", back_populates="reviewer")
    publications = relationship("Publication", back_populates="author")

    @property
    def role(self) -> str:
        """Shortcut to get the role code string."""
        return self.role_rel.code if self.role_rel else None

    def __repr__(self):
        return f"<User {self.email}>"
