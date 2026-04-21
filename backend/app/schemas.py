"""All Pydantic schemas for SciRes — merged into a single file."""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ══════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ══════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    academic_rank: Optional[str] = None
    academic_title: Optional[str] = None
    role: str = Field(default="FACULTY", pattern="^(FACULTY|STAFF|LEADERSHIP|REVIEWER|ADMIN)$")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=200)
    phone: Optional[str] = None
    department_id: Optional[UUID] = None
    academic_rank: Optional[str] = None
    academic_title: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(FACULTY|STAFF|LEADERSHIP|REVIEWER|ADMIN)$")
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    department_id: Optional[UUID]
    academic_rank: Optional[str]
    academic_title: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    department_name: Optional[str] = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int


# ══════════════════════════════════════════════════════════════════
# CATALOG
# ══════════════════════════════════════════════════════════════════

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=20)


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResearchFieldCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=20)


class ResearchFieldUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    is_active: Optional[bool] = None


class ResearchFieldResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProposalCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=20)
    level: str = Field(..., pattern="^(UNIVERSITY|FACULTY|MINISTERIAL)$")
    max_duration_months: Optional[int] = Field(None, ge=1, le=60)
    description: Optional[str] = None


class ProposalCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    level: Optional[str] = Field(None, pattern="^(UNIVERSITY|FACULTY|MINISTERIAL)$")
    max_duration_months: Optional[int] = Field(None, ge=1, le=60)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProposalCategoryResponse(BaseModel):
    id: UUID
    name: str
    code: str
    level: str
    max_duration_months: Optional[int]
    description: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DepartmentListResponse(BaseModel):
    items: List[DepartmentResponse]
    total: int
    page: int
    size: int


class ResearchFieldListResponse(BaseModel):
    items: List[ResearchFieldResponse]
    total: int
    page: int
    size: int


class ProposalCategoryListResponse(BaseModel):
    items: List[ProposalCategoryResponse]
    total: int
    page: int
    size: int


# -- EvaluationCriteriaTemplate --
class EvaluationCriteriaCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=300)
    description: Optional[str] = None
    criteria_json: List[Any] = Field(default_factory=list)

class EvaluationCriteriaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=300)
    description: Optional[str] = None
    criteria_json: Optional[List[Any]] = None
    is_active: Optional[bool] = None

class EvaluationCriteriaResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    criteria_json: List[Any]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class EvaluationCriteriaListResponse(BaseModel):
    items: List[EvaluationCriteriaResponse]
    total: int
    page: int
    size: int


# -- CouncilTypeCatalog --
class CouncilTypeCatalogCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None

class CouncilTypeCatalogUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class CouncilTypeCatalogResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class CouncilTypeCatalogListResponse(BaseModel):
    items: List[CouncilTypeCatalogResponse]
    total: int
    page: int
    size: int


# -- ProposalStatusCatalog --
class ProposalStatusCatalogCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    next_steps_json: List[Any] = Field(default_factory=list)

class ProposalStatusCatalogUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    next_steps_json: Optional[List[Any]] = None
    is_active: Optional[bool] = None

class ProposalStatusCatalogResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str]
    next_steps_json: List[Any]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class ProposalStatusCatalogListResponse(BaseModel):
    items: List[ProposalStatusCatalogResponse]
    total: int
    page: int
    size: int

# ══════════════════════════════════════════════════════════════════
# REGISTRATION PERIOD
# ══════════════════════════════════════════════════════════════════

class PeriodCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    description: Optional[str] = None
    start_date: date
    end_date: date


class PeriodUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PeriodResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    start_date: date
    end_date: date
    status: str
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PeriodListResponse(BaseModel):
    items: List[PeriodResponse]
    total: int
    page: int
    size: int


# ══════════════════════════════════════════════════════════════════
# PROPOSAL
# ══════════════════════════════════════════════════════════════════

class ProposalMemberInfo(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role_in_proposal: str

    model_config = {"from_attributes": True}


class ProposalStatusHistoryItem(BaseModel):
    id: UUID
    from_status: Optional[str]
    to_status: str
    action: str
    actor_id: Optional[UUID]
    note: Optional[str]
    changed_at: datetime

    model_config = {"from_attributes": True}


class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=500)
    summary: Optional[str] = Field(None, max_length=5000)
    objectives: Optional[str] = Field(None, max_length=5000)
    methodology: Optional[str] = Field(None, max_length=5000)
    expected_outcomes: Optional[str] = Field(None, max_length=3000)
    duration_months: Optional[int] = Field(None, ge=1, le=36)
    budget_estimated: Optional[Decimal] = None
    field_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    period_id: Optional[UUID] = None
    attachment_url: Optional[str] = Field(None, max_length=500)
    member_ids: Optional[List[UUID]] = []
    submit: bool = False


class ProposalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=500)
    summary: Optional[str] = Field(None, max_length=5000)
    objectives: Optional[str] = Field(None, max_length=5000)
    methodology: Optional[str] = Field(None, max_length=5000)
    expected_outcomes: Optional[str] = Field(None, max_length=3000)
    duration_months: Optional[int] = Field(None, ge=1, le=36)
    budget_estimated: Optional[Decimal] = None
    field_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    period_id: Optional[UUID] = None
    attachment_url: Optional[str] = Field(None, max_length=500)
    member_ids: Optional[List[UUID]] = None


class ProposalResponse(BaseModel):
    id: UUID
    title: str
    summary: Optional[str]
    objectives: Optional[str]
    methodology: Optional[str]
    expected_outcomes: Optional[str]
    duration_months: Optional[int]
    budget_estimated: Optional[Decimal]
    attachment_url: Optional[str] = None
    status: str
    revision_reason: Optional[str]
    pi_id: UUID
    pi_name: Optional[str] = None
    department_id: Optional[UUID]
    department_name: Optional[str] = None
    field_id: Optional[UUID]
    field_name: Optional[str] = None
    category_id: Optional[UUID]
    category_name: Optional[str] = None
    period_id: Optional[UUID]
    period_title: Optional[str] = None
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    members: List[ProposalMemberInfo] = []

    model_config = {"from_attributes": True}


class ProposalListResponse(BaseModel):
    items: List[ProposalResponse]
    total: int
    page: int
    size: int


class ValidateAction(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|RETURN)$")
    reason: Optional[str] = Field(None, min_length=10)


class ApproveAction(BaseModel):
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    reason: Optional[str] = Field(None, min_length=20)


class ConfirmAcceptanceAction(BaseModel):
    decision: str = Field(..., pattern="^(ACCEPTED|ACCEPTANCE_FAILED)$")
    reason: Optional[str] = None


class AddMemberBody(BaseModel):
    user_id: UUID
    role_in_proposal: str = Field(default="CO_INVESTIGATOR",
                                  pattern="^(CO_INVESTIGATOR|CONSULTANT)$")


# ══════════════════════════════════════════════════════════════════
# COUNCIL
# ══════════════════════════════════════════════════════════════════

class CouncilMemberResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role_in_council: str

    model_config = {"from_attributes": True}


class CouncilCreate(BaseModel):
    name: str = Field(..., min_length=5, max_length=300)
    council_type: str = Field(..., pattern="^(PROPOSAL_REVIEW|ACCEPTANCE)$")
    proposal_id: UUID
    scheduled_date: Optional[date] = None
    location: Optional[str] = None


class CouncilUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=5, max_length=300)
    scheduled_date: Optional[date] = None
    location: Optional[str] = None


class CouncilResponse(BaseModel):
    id: UUID
    name: str
    council_type: str
    proposal_id: UUID
    proposal_title: Optional[str] = None
    status: str
    scheduled_date: Optional[date]
    location: Optional[str]
    created_at: datetime
    updated_at: datetime
    members: List[CouncilMemberResponse] = []

    model_config = {"from_attributes": True}


class AddCouncilMemberBody(BaseModel):
    user_id: UUID
    role_in_council: str = Field(default="REVIEWER",
                                  pattern="^(CHAIR|SECRETARY|REVIEWER)$")


# ══════════════════════════════════════════════════════════════════
# REVIEW (Proposal Review)
# ══════════════════════════════════════════════════════════════════

class ReviewSubmit(BaseModel):
    council_id: UUID
    proposal_id: UUID
    score: Decimal = Field(..., ge=0, le=100)
    verdict: str = Field(..., pattern="^(PASS|FAIL|NEEDS_REVISION)$")
    comments: str = Field(..., min_length=50)
    criteria_scores: Optional[Any] = None


class ReviewResponse(BaseModel):
    id: UUID
    council_id: UUID
    proposal_id: UUID
    proposal_title: Optional[str] = None
    reviewer_id: UUID
    reviewer_name: Optional[str] = None
    score: Optional[Decimal] = None
    comments: Optional[str] = None
    verdict: Optional[str] = None
    status: str
    criteria_scores: Optional[Any] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════
# PROGRESS REPORT
# ══════════════════════════════════════════════════════════════════

class ProgressCreate(BaseModel):
    report_period: Optional[str] = Field(None, max_length=100)
    content: str = Field(..., min_length=20, description="Công việc đã hoàn thành")
    products_created: Optional[str] = Field(None, description="Sản phẩm đã tạo ra")
    completion_pct: Decimal = Field(..., ge=0, le=100, description="Phần trăm hoàn thành")
    issues: Optional[str] = Field(None, description="Khó khăn / rủi ro")
    next_steps: str = Field(..., min_length=10, description="Kế hoạch tiếp theo")
    attachment_url: Optional[str] = Field(None, max_length=500, description="Minh chứng đính kèm")


class ProgressUpdate(BaseModel):
    report_period: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = Field(None, min_length=20)
    products_created: Optional[str] = None
    completion_pct: Optional[Decimal] = Field(None, ge=0, le=100)
    issues: Optional[str] = None
    next_steps: Optional[str] = Field(None, min_length=10)
    attachment_url: Optional[str] = Field(None, max_length=500)


class ProgressReviewAction(BaseModel):
    status: str = Field(..., pattern="^(ACCEPTED|NEEDS_REVISION|DELAYED)$")
    note: Optional[str] = Field(None, min_length=5)


class ProgressResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    proposal_title: Optional[str] = None
    submitted_by: UUID
    submitted_by_name: Optional[str] = None
    report_order: int
    report_period: Optional[str]
    content: str
    products_created: Optional[str] = None
    completion_pct: Decimal
    issues: Optional[str]
    next_steps: str
    attachment_url: Optional[str] = None
    status: str
    is_overdue: bool = False
    reviewed_by: Optional[UUID] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class ProgressDetailResponse(ProgressResponse):
    """Extended response with proposal context."""
    pass


class ProgressListResponse(BaseModel):
    items: List[ProgressResponse]
    total: int
    page: int
    size: int


class ProjectTimelineResponse(BaseModel):
    proposal_id: UUID
    proposal_title: str
    proposal_status: str
    pi_name: Optional[str] = None
    duration_months: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    status_history: List[Any] = []
    progress_reports: List[ProgressResponse] = []
    total_reports: int = 0
    latest_completion_pct: float = 0.0


class DashboardFacultyProgressResponse(BaseModel):
    total_active_projects: int
    items: List[Any] = []


class DashboardStaffProgressResponse(BaseModel):
    total_in_progress: int
    total_approved_not_started: int
    total_overdue_reports: int
    pending_review_count: int
    status_breakdown: Any = {}


# ══════════════════════════════════════════════════════════════════
# ACCEPTANCE
# ══════════════════════════════════════════════════════════════════

class AcceptanceDossierCreate(BaseModel):
    """Tạo mới hồ sơ nghiệm thu."""
    final_report: str = Field(..., min_length=50, description="Báo cáo tổng kết")
    achievements: str = Field(..., min_length=20, description="Sản phẩm đạt được")
    deliverables: Optional[str] = Field(None, description="Mô tả sản phẩm cụ thể")
    impact_summary: Optional[str] = Field(None, description="Tóm tắt ứng dụng / tác động")
    self_assessment: Optional[str] = Field(None, description="Tự đánh giá")
    completion_explanation: Optional[str] = Field(None, description="Giải trình hoàn thành so với mục tiêu")
    linked_publication_ids: Optional[List[UUID]] = Field(default_factory=list)
    attachments_metadata: Optional[List[Any]] = Field(default_factory=list)


class AcceptanceDossierUpdate(BaseModel):
    """Cập nhật hồ sơ (chỉ khi DRAFT hoặc REVISION_REQUESTED)."""
    final_report: Optional[str] = Field(None, min_length=50)
    achievements: Optional[str] = Field(None, min_length=20)
    deliverables: Optional[str] = None
    impact_summary: Optional[str] = None
    self_assessment: Optional[str] = None
    completion_explanation: Optional[str] = None
    linked_publication_ids: Optional[List[UUID]] = None
    attachments_metadata: Optional[List[Any]] = None


class AcceptanceDossierHistoryItem(BaseModel):
    id: UUID
    from_status: Optional[str]
    to_status: str
    action: str
    actor_id: Optional[UUID] = None
    note: Optional[str]
    changed_at: datetime
    model_config = {"from_attributes": True}


class AcceptanceDossierResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    proposal_title: Optional[str] = None
    submitted_by: UUID
    submitted_by_name: Optional[str] = None
    final_report: str
    achievements: str
    deliverables: Optional[str] = None
    impact_summary: Optional[str] = None
    self_assessment: Optional[str] = None
    completion_explanation: Optional[str] = None
    linked_publication_ids: Optional[List[Any]] = []
    attachments_metadata: Optional[List[Any]] = []
    status: str
    revision_reason: Optional[str] = None
    final_verdict: Optional[str] = None
    finalized_by: Optional[UUID] = None
    finalized_by_name: Optional[str] = None
    finalized_at: Optional[datetime] = None
    finalize_note: Optional[str] = None
    submitted_at: Optional[datetime] = None
    updated_at: datetime
    created_at: datetime
    status_history: List[AcceptanceDossierHistoryItem] = []

    model_config = {"from_attributes": True}


class AcceptanceDossierListResponse(BaseModel):
    items: List[AcceptanceDossierResponse]
    total: int
    page: int
    size: int


class AcceptanceDossierValidate(BaseModel):
    """Staff validates/returns a submitted dossier."""
    action: str = Field(..., pattern="^(APPROVE|RETURN)$")
    reason: Optional[str] = Field(None, min_length=10)


class AcceptanceFinalizeAction(BaseModel):
    """Leadership finalizes the acceptance result."""
    verdict: str = Field(..., pattern="^(excellent|good|pass|fail|revise_required)$")
    note: Optional[str] = None


class AcceptanceReviewSubmit(BaseModel):
    dossier_id: UUID
    council_id: UUID
    score: Decimal = Field(..., ge=0, le=100)
    verdict: str = Field(..., pattern="^(PASS|FAIL|NEEDS_REVISION)$")
    comments: str = Field(..., min_length=20)


class AcceptanceReviewResponse(BaseModel):
    id: UUID
    dossier_id: UUID
    council_id: UUID
    reviewer_id: UUID
    reviewer_name: Optional[str] = None
    score: Optional[Decimal]
    comments: Optional[str]
    verdict: Optional[str]
    status: str
    reviewed_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# Legacy aliases for backward compatibility
AcceptanceSubmit = AcceptanceDossierCreate
AcceptanceReturn = AcceptanceDossierValidate
ConfirmAcceptanceAction = AcceptanceFinalizeAction
