"""Council management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.council import Council, CouncilMember
from app.models.proposal import Proposal, ProposalStatusHistory
from app.models.review import Review
from app.models.acceptance import AcceptanceDossier, AcceptanceReview
from app.schemas import (
    CouncilCreate, CouncilUpdate, CouncilResponse,
    CouncilMemberResponse, AddCouncilMemberBody,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/councils", tags=["Councils"])


def _load(db: Session, council_id: UUID) -> Council:
    c = db.query(Council).options(
        joinedload(Council.proposal),
        joinedload(Council.members).joinedload(CouncilMember.user),
    ).filter(Council.id == council_id).first()
    if not c: raise NotFoundException("Hội đồng")
    return c


def _resp(c: Council) -> CouncilResponse:
    return CouncilResponse(
        id=c.id, name=c.name, council_type=c.council_type, proposal_id=c.proposal_id,
        proposal_title=c.proposal.title if c.proposal else None,
        status=c.status, scheduled_date=c.scheduled_date, location=c.location,
        created_at=c.created_at, updated_at=c.updated_at,
        members=[CouncilMemberResponse(user_id=m.user_id, full_name=m.user.full_name,
                                       email=m.user.email, role_in_council=m.role_in_council)
                 for m in c.members],
    )


def _log_proposal(db, proposal, from_s, to_s, action, actor_id):
    db.add(ProposalStatusHistory(proposal_id=proposal.id, from_status=from_s,
                                  to_status=to_s, action=action, actor_id=actor_id))


@router.get("/", response_model=list[CouncilResponse])
async def list_councils(current_user: User = Depends(require_roles("STAFF", "ADMIN")), db: Session = Depends(get_db)):
    """List all councils."""
    councils = db.query(Council).options(
        joinedload(Council.proposal),
        joinedload(Council.members).joinedload(CouncilMember.user),
    ).order_by(Council.created_at.desc()).all()
    return [_resp(c) for c in councils]


@router.post("/", response_model=CouncilResponse, status_code=201)
async def create_council(body: CouncilCreate, current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db)):
    proposal = db.query(Proposal).filter(Proposal.id == body.proposal_id).first()
    if not proposal: raise NotFoundException("Đề tài")
    if body.council_type == "PROPOSAL_REVIEW" and proposal.status != "VALIDATED":
        raise BadRequestException("Đề tài phải ở trạng thái Đã kiểm tra để tạo hội đồng phản biện")
    if body.council_type == "ACCEPTANCE" and proposal.status != "ACCEPTANCE_SUBMITTED":
        raise BadRequestException("Đề tài phải ở trạng thái Đã nộp nghiệm thu để tạo hội đồng nghiệm thu")
    c = Council(name=body.name, council_type=body.council_type, proposal_id=body.proposal_id,
                scheduled_date=body.scheduled_date, location=body.location)
    db.add(c); db.commit(); db.refresh(c)
    return _resp(_load(db, c.id))


@router.get("/my-reviews", response_model=list[CouncilResponse])
async def my_reviews(current_user: User = Depends(require_roles("REVIEWER")), db: Session = Depends(get_db)):
    """Get all councils the current reviewer is assigned to."""
    member_ids = db.query(CouncilMember.council_id).filter(CouncilMember.user_id == current_user.id).subquery()
    councils = db.query(Council).options(
        joinedload(Council.proposal),
        joinedload(Council.members).joinedload(CouncilMember.user),
    ).filter(Council.id.in_(member_ids)).all()
    return [_resp(c) for c in councils]


@router.get("/proposal/{proposal_id}", response_model=list[CouncilResponse])
async def get_proposal_councils(proposal_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all councils associated with a proposal."""
    councils = db.query(Council).options(
        joinedload(Council.proposal),
        joinedload(Council.members).joinedload(CouncilMember.user),
    ).filter(Council.proposal_id == proposal_id).all()
    return [_resp(c) for c in councils]


@router.get("/{council_id}", response_model=CouncilResponse)
async def get_council(council_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _resp(_load(db, council_id))


@router.put("/{council_id}", response_model=CouncilResponse)
async def update_council(council_id: UUID, body: CouncilUpdate, current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db)):
    c = _load(db, council_id)
    if c.status != "FORMING": raise BadRequestException("Chỉ có thể chỉnh sửa hội đồng đang thành lập")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(c, f, v)
    db.commit()
    return _resp(_load(db, council_id))


@router.post("/{council_id}/members", response_model=CouncilResponse)
async def add_member(council_id: UUID, body: AddCouncilMemberBody, current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db)):
    c = _load(db, council_id)
    if c.status != "FORMING": raise BadRequestException("Hội đồng đã hoạt động, không thể thêm thành viên")
    proposal = db.query(Proposal).options(joinedload(Proposal.members)).filter(Proposal.id == c.proposal_id).first()
    participant_ids = {proposal.pi_id} | {m.user_id for m in proposal.members}
    if body.user_id in participant_ids: raise BadRequestException("Phản biện không thể là thành viên của đề tài")
    if db.query(CouncilMember).filter(CouncilMember.council_id == council_id, CouncilMember.user_id == body.user_id).first():
        raise BadRequestException("Thành viên đã có trong hội đồng")
    db.add(CouncilMember(council_id=council_id, user_id=body.user_id, role_in_council=body.role_in_council))
    db.commit()
    return _resp(_load(db, council_id))


@router.delete("/{council_id}/members/{user_id}", response_model=CouncilResponse)
async def remove_member(council_id: UUID, user_id: UUID, current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db)):
    c = _load(db, council_id)
    if c.status != "FORMING": raise BadRequestException("Hội đồng đã hoạt động, không thể xóa thành viên")
    member = db.query(CouncilMember).filter(CouncilMember.council_id == council_id, CouncilMember.user_id == user_id).first()
    if not member: raise NotFoundException("Thành viên hội đồng")
    db.delete(member); db.commit()
    return _resp(_load(db, council_id))


@router.post("/{council_id}/activate", response_model=CouncilResponse)
async def activate_council(council_id: UUID, current_user: User = Depends(require_roles("STAFF")), db: Session = Depends(get_db)):
    """T5/T11: Activate council → create review stubs → transition proposal."""
    c = _load(db, council_id)
    if c.status != "FORMING": raise BadRequestException("Hội đồng đã được kích hoạt")

    reviewer_members = [m for m in c.members if m.role_in_council in ("REVIEWER", "CHAIR")]
    if len(reviewer_members) < 2:
        raise BadRequestException("Hội đồng phải có ít nhất 2 phản biện")

    proposal = db.query(Proposal).filter(Proposal.id == c.proposal_id).first()

    if c.council_type == "PROPOSAL_REVIEW":
        if proposal.status != "VALIDATED":
            raise BadRequestException("Đề tài phải ở trạng thái Đã kiểm tra")
        for m in reviewer_members:
            db.add(Review(council_id=c.id, reviewer_id=m.user_id, proposal_id=proposal.id, status="PENDING"))
        old = proposal.status; proposal.status = "UNDER_REVIEW"
        _log_proposal(db, proposal, old, "UNDER_REVIEW", "start_review", current_user.id)

    elif c.council_type == "ACCEPTANCE":
        if proposal.status != "ACCEPTANCE_SUBMITTED":
            raise BadRequestException("Đề tài phải ở trạng thái Đã nộp nghiệm thu")
        dossier = db.query(AcceptanceDossier).filter(AcceptanceDossier.proposal_id == proposal.id).first()
        if not dossier: raise BadRequestException("Không tìm thấy hồ sơ nghiệm thu")
        for m in reviewer_members:
            db.add(AcceptanceReview(dossier_id=dossier.id, council_id=c.id, reviewer_id=m.user_id, status="PENDING"))
        old = proposal.status; proposal.status = "UNDER_ACCEPTANCE_REVIEW"
        _log_proposal(db, proposal, old, "UNDER_ACCEPTANCE_REVIEW", "start_acceptance_review", current_user.id)

    c.status = "ACTIVE"; db.commit()
    return _resp(_load(db, council_id))
