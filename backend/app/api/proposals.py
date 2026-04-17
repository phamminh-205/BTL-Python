"""Proposal endpoints with full state machine enforcement."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.proposal import Proposal, ProposalMember, ProposalStatusHistory
from app.models.period import RegistrationPeriod
from app.models.approval import ApprovalHistory, ApprovalStep
from app.schemas import (
    ProposalCreate, ProposalUpdate, ProposalResponse, ProposalListResponse,
    ProposalMemberInfo, ProposalStatusHistoryItem,
    ValidateAction, ApproveAction, ConfirmAcceptanceAction, AddMemberBody,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

router = APIRouter(prefix="/proposals", tags=["Proposals"])


# ── Helpers ───────────────────────────────────────────────────────

def _load(db: Session, proposal_id: UUID) -> Proposal:
    p = (
        db.query(Proposal)
        .options(
            joinedload(Proposal.principal_investigator),
            joinedload(Proposal.department),
            joinedload(Proposal.research_field),
            joinedload(Proposal.category),
            joinedload(Proposal.registration_period),
            joinedload(Proposal.members).joinedload(ProposalMember.user),
        )
        .filter(Proposal.id == proposal_id)
        .first()
    )
    if not p:
        raise NotFoundException("Đề tài")
    return p


def _resp(p: Proposal) -> ProposalResponse:
    pi = p.principal_investigator
    return ProposalResponse(
        id=p.id, title=p.title, summary=p.summary, objectives=p.objectives,
        methodology=p.methodology, expected_outcomes=p.expected_outcomes,
        duration_months=p.duration_months, budget_estimated=p.budget_estimated,
        attachment_url=p.attachment_url,
        status=p.status, revision_reason=p.revision_reason,
        pi_id=p.pi_id, pi_name=pi.full_name if pi else None,
        department_id=p.department_id,
        department_name=p.department.name if p.department else None,
        field_id=p.field_id,
        field_name=p.research_field.name if p.research_field else None,
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        period_id=p.period_id,
        period_title=p.registration_period.title if p.registration_period else None,
        submitted_at=p.submitted_at, approved_at=p.approved_at,
        created_at=p.created_at, updated_at=p.updated_at,
        members=[
            ProposalMemberInfo(user_id=m.user_id, full_name=m.user.full_name,
                               email=m.user.email, role_in_proposal=m.role_in_proposal)
            for m in p.members
        ],
    )


def _log(db, proposal, from_s, to_s, action, actor_id, note=None):
    db.add(ProposalStatusHistory(
        proposal_id=proposal.id, from_status=from_s, to_status=to_s,
        action=action, actor_id=actor_id, note=note,
    ))


def _sync_members(db, proposal, member_ids, pi_id):
    db.query(ProposalMember).filter(ProposalMember.proposal_id == proposal.id).delete()
    for uid in member_ids:
        if uid != pi_id:
            db.add(ProposalMember(proposal_id=proposal.id, user_id=uid))


# ── List / Get ────────────────────────────────────────────────────

@router.get("/", response_model=ProposalListResponse)
async def list_proposals(
    page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=50),
    status: Optional[str] = None, period_id: Optional[UUID] = None,
    mine: bool = False,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    opts = [
        joinedload(Proposal.principal_investigator), joinedload(Proposal.department),
        joinedload(Proposal.research_field), joinedload(Proposal.category),
        joinedload(Proposal.registration_period),
        joinedload(Proposal.members).joinedload(ProposalMember.user),
    ]
    q = db.query(Proposal).options(*opts)

    if current_user.role == "FACULTY":
        member_pids = db.query(ProposalMember.proposal_id).filter(ProposalMember.user_id == current_user.id).subquery()
        q = q.filter((Proposal.pi_id == current_user.id) | (Proposal.id.in_(member_pids)))
    elif mine:
        q = q.filter(Proposal.pi_id == current_user.id)

    if current_user.role == "REVIEWER":
        from app.models.review import Review
        rpids = db.query(Review.proposal_id).filter(Review.reviewer_id == current_user.id).subquery()
        q = q.filter(Proposal.id.in_(rpids))

    if status:
        q = q.filter(Proposal.status == status)
    if period_id:
        q = q.filter(Proposal.period_id == period_id)

    total = q.count()
    proposals = q.order_by(Proposal.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return ProposalListResponse(items=[_resp(p) for p in proposals], total=total, page=page, size=size)


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = _load(db, proposal_id)
    if current_user.role == "FACULTY":
        member_ids = [m.user_id for m in p.members]
        if p.pi_id != current_user.id and current_user.id not in member_ids:
            raise ForbiddenException()
    return _resp(p)


@router.get("/stats/faculty")
async def get_faculty_stats(current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db)):
    """Lấy số lượng đề tài theo từng trạng thái của giảng viên."""
    from sqlalchemy import func
    stats = db.query(Proposal.status, func.count(Proposal.id)).filter(Proposal.pi_id == current_user.id).group_by(Proposal.status).all()
    return {"stats": {status: count for status, count in stats}}


# ── Create / Update / Delete ──────────────────────────────────────

@router.post("/", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    body: ProposalCreate,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    target = "SUBMITTED" if body.submit else "DRAFT"
    if body.submit:
        if not all([body.summary, body.objectives, body.methodology, body.expected_outcomes, body.duration_months, body.field_id, body.period_id]):
            raise BadRequestException("Vui lòng điền đầy đủ thông tin bắt buộc trước khi nộp")
        period = db.query(RegistrationPeriod).filter(RegistrationPeriod.id == body.period_id).first()
        if not period or period.status != "OPEN":
            raise BadRequestException("Đợt đăng ký không hợp lệ hoặc đã đóng")
        if db.query(Proposal).filter(Proposal.title == body.title, Proposal.period_id == body.period_id).first():
            raise BadRequestException("Tên đề tài đã tồn tại trong đợt đăng ký này")
        if db.query(Proposal).filter(Proposal.pi_id == current_user.id, Proposal.period_id == body.period_id, Proposal.status != "DRAFT").count() >= 3:
            raise BadRequestException("Mỗi giảng viên chỉ được đăng ký tối đa 3 đề tài mỗi đợt")

    p = Proposal(
        title=body.title, summary=body.summary, objectives=body.objectives,
        methodology=body.methodology, expected_outcomes=body.expected_outcomes,
        duration_months=body.duration_months, budget_estimated=body.budget_estimated,
        attachment_url=body.attachment_url,
        field_id=body.field_id, category_id=body.category_id, period_id=body.period_id,
        pi_id=current_user.id, department_id=current_user.department_id,
        status=target, submitted_at=datetime.now(timezone.utc) if body.submit else None,
    )
    db.add(p); db.flush()
    if body.member_ids:
        _sync_members(db, p, body.member_ids, current_user.id)
    _log(db, p, None, target, "submit" if body.submit else "create", current_user.id)
    db.commit()
    return _resp(_load(db, p.id))


@router.put("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: UUID, body: ProposalUpdate,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    p = _load(db, proposal_id)
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status not in ("DRAFT", "REVISION_REQUESTED"):
        raise BadRequestException("Chỉ có thể chỉnh sửa đề tài ở trạng thái Bản nháp hoặc Yêu cầu chỉnh sửa")
    update_data = body.model_dump(exclude_unset=True)
    member_ids = update_data.pop("member_ids", None)
    for f, v in update_data.items(): setattr(p, f, v)
    if member_ids is not None: _sync_members(db, p, member_ids, current_user.id)
    db.commit()
    return _resp(_load(db, proposal_id))


@router.delete("/{proposal_id}", status_code=204)
async def delete_proposal(
    proposal_id: UUID,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    p = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not p: raise NotFoundException("Đề tài")
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status != "DRAFT": raise BadRequestException("Chỉ có thể xóa đề tài ở trạng thái Bản nháp")
    db.delete(p); db.commit()


# ── State Transitions ─────────────────────────────────────────────

@router.post("/{proposal_id}/submit", response_model=ProposalResponse)
async def submit_proposal(
    proposal_id: UUID,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    """T1, T4: DRAFT/REVISION_REQUESTED → SUBMITTED"""
    p = _load(db, proposal_id)
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status not in ("DRAFT", "REVISION_REQUESTED"):
        raise BadRequestException(f"Không thể nộp đề tài ở trạng thái: {p.status}")
    if not all([p.summary, p.objectives, p.methodology, p.expected_outcomes, p.duration_months, p.field_id, p.period_id]):
        raise BadRequestException("Vui lòng điền đầy đủ thông tin bắt buộc")
    if p.registration_period and p.registration_period.status != "OPEN":
        raise BadRequestException("Đợt đăng ký đã đóng")
    if p.status == "DRAFT":
        count = db.query(Proposal).filter(Proposal.pi_id == current_user.id, Proposal.period_id == p.period_id, Proposal.status != "DRAFT", Proposal.id != p.id).count()
        if count >= 3: raise BadRequestException("Mỗi giảng viên chỉ được đăng ký tối đa 3 đề tài mỗi đợt")
    old = p.status
    p.status = "SUBMITTED"; p.submitted_at = datetime.now(timezone.utc); p.revision_reason = None
    _log(db, p, old, "SUBMITTED", "submit", current_user.id)
    db.commit()
    return _resp(_load(db, proposal_id))


@router.post("/{proposal_id}/validate", response_model=ProposalResponse)
async def validate_proposal(
    proposal_id: UUID, body: ValidateAction,
    current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db),
):
    """T2, T3: SUBMITTED → VALIDATED | REVISION_REQUESTED"""
    p = _load(db, proposal_id)
    if p.status != "SUBMITTED": raise BadRequestException("Chỉ có thể kiểm tra đề tài ở trạng thái Đã nộp")
    old = p.status
    if body.action == "APPROVE":
        p.status = "VALIDATED"
        _log(db, p, old, "VALIDATED", "validate_approve", current_user.id)
    else:
        if not body.reason or len(body.reason) < 10:
            raise BadRequestException("Lý do trả lại phải có ít nhất 10 ký tự")
        p.status = "REVISION_REQUESTED"; p.revision_reason = body.reason
        _log(db, p, old, "REVISION_REQUESTED", "validate_return", current_user.id, note=body.reason)
    db.commit()
    return _resp(_load(db, proposal_id))


@router.post("/{proposal_id}/approve", response_model=ProposalResponse)
async def approve_proposal(
    proposal_id: UUID, body: ApproveAction,
    current_user: User = Depends(require_roles("LEADERSHIP")), db: Session = Depends(get_db),
):
    """T7, T8, T9: REVIEWED → APPROVED→IN_PROGRESS | REJECTED"""
    p = _load(db, proposal_id)
    if p.status != "REVIEWED": raise BadRequestException("Chỉ có thể phê duyệt đề tài ở trạng thái Đã phản biện")
    if body.decision == "REJECTED" and (not body.reason or len(body.reason) < 20):
        raise BadRequestException("Lý do từ chối phải có ít nhất 20 ký tự")

    step = db.query(ApprovalStep).filter(ApprovalStep.step_code == "LEADERSHIP_APPROVE").first()
    db.add(ApprovalHistory(proposal_id=p.id, step_id=step.id if step else None,
                           decided_by=current_user.id, decision=body.decision, reason=body.reason))

    old = p.status; p.status = body.decision
    _log(db, p, old, body.decision, "approve" if body.decision == "APPROVED" else "reject",
         current_user.id, note=body.reason)

    if body.decision == "APPROVED":
        p.approved_at = datetime.now(timezone.utc); p.status = "IN_PROGRESS"
        _log(db, p, "APPROVED", "IN_PROGRESS", "auto_start", current_user.id)

    db.commit()
    return _resp(_load(db, proposal_id))


@router.post("/{proposal_id}/submit-acceptance", response_model=ProposalResponse)
async def submit_acceptance_status(
    proposal_id: UUID,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    """Updates proposal status when dossier submitted (called internally)."""
    p = _load(db, proposal_id)
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status not in ("IN_PROGRESS", "ACCEPTANCE_REVISION_REQUESTED"):
        raise BadRequestException("Đề tài chưa ở trạng thái hợp lệ")
    old = p.status; action = "submit_acceptance" if old == "IN_PROGRESS" else "resubmit_acceptance"
    p.status = "ACCEPTANCE_SUBMITTED"
    _log(db, p, old, "ACCEPTANCE_SUBMITTED", action, current_user.id)
    db.commit()
    return _resp(_load(db, proposal_id))


@router.post("/{proposal_id}/confirm-acceptance", response_model=ProposalResponse)
async def confirm_acceptance(
    proposal_id: UUID, body: ConfirmAcceptanceAction,
    current_user: User = Depends(require_roles("LEADERSHIP")), db: Session = Depends(get_db),
):
    """T14, T15: UNDER_ACCEPTANCE_REVIEW → ACCEPTED | ACCEPTANCE_FAILED"""
    p = _load(db, proposal_id)
    if p.status != "UNDER_ACCEPTANCE_REVIEW": raise BadRequestException("Đề tài chưa ở trạng thái đang nghiệm thu")
    old = p.status; p.status = body.decision
    action = "confirm_accept" if body.decision == "ACCEPTED" else "confirm_fail"
    _log(db, p, old, body.decision, action, current_user.id, note=body.reason)
    db.commit()
    return _resp(_load(db, proposal_id))


# ── Sub-resources ─────────────────────────────────────────────────

@router.get("/{proposal_id}/history", response_model=list[ProposalStatusHistoryItem])
async def get_history(proposal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not db.query(Proposal).filter(Proposal.id == proposal_id).first():
        raise NotFoundException("Đề tài")
    return db.query(ProposalStatusHistory).filter(ProposalStatusHistory.proposal_id == proposal_id).order_by(ProposalStatusHistory.changed_at).all()


@router.post("/{proposal_id}/members", response_model=ProposalResponse)
async def add_member(
    proposal_id: UUID, body: AddMemberBody,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    p = _load(db, proposal_id)
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status not in ("DRAFT", "REVISION_REQUESTED"): raise BadRequestException("Chỉ có thể chỉnh sửa thành viên khi đề tài ở dạng bản nháp")
    if body.user_id == current_user.id: raise BadRequestException("PI không thể tự thêm mình làm thành viên")
    if db.query(ProposalMember).filter(ProposalMember.proposal_id == proposal_id, ProposalMember.user_id == body.user_id).first():
        raise BadRequestException("Thành viên đã tồn tại")
    db.add(ProposalMember(proposal_id=proposal_id, user_id=body.user_id, role_in_proposal=body.role_in_proposal))
    db.commit()
    return _resp(_load(db, proposal_id))


@router.delete("/{proposal_id}/members/{user_id}", response_model=ProposalResponse)
async def remove_member(
    proposal_id: UUID, user_id: UUID,
    current_user: User = Depends(require_roles("FACULTY")), db: Session = Depends(get_db),
):
    p = _load(db, proposal_id)
    if p.pi_id != current_user.id: raise ForbiddenException()
    if p.status not in ("DRAFT", "REVISION_REQUESTED"): raise BadRequestException("Chỉ có thể chỉnh sửa thành viên khi đề tài ở dạng bản nháp")
    member = db.query(ProposalMember).filter(ProposalMember.proposal_id == proposal_id, ProposalMember.user_id == user_id).first()
    if not member: raise NotFoundException("Thành viên")
    db.delete(member); db.commit()
    return _resp(_load(db, proposal_id))
