import enum
import uuid
from sqlalchemy import (
    Column, String, ForeignKey, DateTime, Date, Text, Enum, Numeric, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.database import Base

# ===============================
# ENUMs
# ===============================
class UserRole(str, enum.Enum):
    ADMIN = 'ADMIN'
    TEACHER = 'TEACHER'
    STUDENT = 'STUDENT'

class ProjectStatus(str, enum.Enum):
    DRAFT = 'DRAFT'
    SUBMITTED = 'SUBMITTED'
    APPROVED = 'APPROVED'
    COMPLETED = 'COMPLETED'
    REJECTED = 'REJECTED'

class ProjectMemberRole(str, enum.Enum):
    CHAIRMAN = 'CHAIRMAN'
    MEMBER = 'MEMBER'
    SECRETARY = 'SECRETARY'

# ===============================
# MODELS
# ===============================
class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name='user_role'), nullable=False, default=UserRole.STUDENT)
    email = Column(String(255), unique=True, nullable=False, index=True)
    department = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    led_projects = relationship("Project", back_populates="leader")
    project_memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = 'projects'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    research_field = Column(String(100), nullable=False)
    budget = Column(Numeric(15, 2), default=0.00)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    description = Column(Text)
    status = Column(Enum(ProjectStatus, name='project_status'), default=ProjectStatus.DRAFT, index=True)
    leader_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint('end_date >= start_date', name='check_dates'),
    )

    # Relationships
    leader = relationship("User", back_populates="led_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    publications = relationship("Publication", back_populates="project")


class ProjectMember(Base):
    __tablename__ = 'project_members'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True)
    role_in_project = Column(Enum(ProjectMemberRole, name='project_member_role'), nullable=False, default=ProjectMemberRole.MEMBER)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="project_memberships")
    project = relationship("Project", back_populates="members")


class Publication(Base):
    __tablename__ = 'publications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    journal_name = Column(String(255), nullable=False)
    publication_date = Column(Date, nullable=False)
    file_url = Column(Text)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='SET NULL'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = relationship("Project", back_populates="publications")
