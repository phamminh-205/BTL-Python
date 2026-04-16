"""Catalog models: Department, ResearchField, ProposalCategory."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="department")
    proposals = relationship("Proposal", back_populates="department", foreign_keys="Proposal.department_id")

    def __repr__(self):
        return f"<Department {self.code}>"


class ResearchField(Base):
    __tablename__ = "research_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    proposals = relationship("Proposal", back_populates="research_field")

    def __repr__(self):
        return f"<ResearchField {self.code}>"


class ProposalCategory(Base):
    """Type/level of research proposal (cấp trường, cấp khoa, cấp bộ)."""
    __tablename__ = "proposal_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    level = Column(String(50), nullable=False)  # UNIVERSITY, FACULTY, MINISTERIAL
    max_duration_months = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    proposals = relationship("Proposal", back_populates="category")

    def __repr__(self):
        return f"<ProposalCategory {self.code}>"


class EvaluationCriteriaTemplate(Base):
    """Mẫu tiêu chí đánh giá cho các hội đồng."""
    __tablename__ = "evaluation_criteria_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(300), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    criteria_json = Column(JSON, nullable=False, default=list)  # List of criteria objects
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<EvaluationCriteriaTemplate {self.name}>"


class CouncilTypeCatalog(Base):
    """Danh mục loại hội đồng."""
    __tablename__ = "council_type_catalogs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)  # PROPOSAL_REVIEW, ACCEPTANCE, etc.
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<CouncilTypeCatalog {self.code}>"


class ProposalStatusCatalog(Base):
    """Danh mục trạng thái đề tài và cấu hình workflow cơ bản."""
    __tablename__ = "proposal_status_catalogs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)  # DRAFT, SUBMITTED, IN_PROGRESS, etc.
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    next_steps_json = Column(JSON, nullable=True, default=list)  # Possible next statuses/actions
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<ProposalStatusCatalog {self.code}>"

