"""SQLAlchemy ORM models — package init.

Import all models here so Alembic's autogenerate can detect them.
"""

from app.models.role import Role
from app.models.user import User
from app.models.catalog import Department, ResearchField, ProposalCategory
from app.models.period import RegistrationPeriod
from app.models.proposal import Proposal, ProposalMember, ProposalStatusHistory
from app.models.council import Council, CouncilMember
from app.models.review import Review
from app.models.approval import ApprovalStep, ApprovalHistory
from app.models.progress import ProgressReport
from app.models.acceptance import AcceptanceDossier, AcceptanceDossierHistory, AcceptanceReview
from app.models.publication import Publication
from app.models.audit import LoginLog

__all__ = [
    "Role",
    "User",
    "Department",
    "ResearchField",
    "ProposalCategory",
    "RegistrationPeriod",
    "Proposal",
    "ProposalMember",
    "ProposalStatusHistory",
    "Council",
    "CouncilMember",
    "Review",
    "ApprovalStep",
    "ApprovalHistory",
    "ProgressReport",
    "AcceptanceDossier",
    "AcceptanceDossierHistory",
    "AcceptanceReview",
    "Publication",
    "LoginLog",
]

