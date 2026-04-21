"""Acceptance (Nghiệm thu) API — full lifecycle for project final evaluation."""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.proposal import Proposal, ProposalStatusHistory
from app.models.acceptance import AcceptanceDossier, AcceptanceDossierHistory, AcceptanceReview
from app.models.council import Council
from app.models.publication import Publication
from app.schemas import (
    AcceptanceDossierCreate, AcceptanceDossierUpdate, AcceptanceDossierResponse,
    AcceptanceDossierListResponse, AcceptanceDossierHistoryItem,
    AcceptanceDossierValidate, AcceptanceFinalizeAction,
    AcceptanceReviewSubmit, AcceptanceReviewResponse,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

router = APIRouter(prefix="/acceptance", tags=["Acceptance (Nghiệm thu)"])


# ── State Machine ──────────────────────────────────────────────────
# DRAFT → SUBMITTED (faculty submits)
# SUBMITTED → UNDER_REVIEW (staff approves) | REVISION_REQUESTED (staff returns)
# REVISION_REQUESTED → SUBMITTED (faculty resubmits)
# UNDER_REVIEW → REVIEWED (all reviewers done)
# REVIEWED → ACCEPTED | FAILED | REVISION_REQUESTED (leadership finalizes)

FACULTY_EDITABLE = {"DRAFT", "REVISION_REQUESTED"}
VALID_PROPOSAL_STATUSES = {"IN_PROGRESS", "COMPLETED", "ACCEPTED", "ACCEPTANCE_REVISION_REQUESTED"}


# ── Helper: build response ─────────────────────────────────────────

def _dossier_to_resp(d: AcceptanceDossier) -> AcceptanceDossierResponse:
    history_items = [
        AcceptanceDossierHistoryItem(
            id=h.id,
            from_status=h.from_status,
            to_status=h.to_status,
            action=h.action,
            actor_id=h.actor_id,
            note=h.note,
            changed_at=h.changed_at,
        )
        for h in (d.status_history or [])
    ]
    finalized_by_name = None
    if d.finalizer:
        finalized_by_name = d.finalizer.full_name
    return AcceptanceDossierResponse(
        id=d.id,
        proposal_id=d.proposal_id,
        proposal_title=d.proposal.title if d.proposal else None,
        submitted_by=d.submitted_by,
        submitted_by_name=d.submitter.full_name if d.submitter else None,
        final_report=d.final_report,
        achievements=d.achievements,
        deliverables=d.deliverables,
        impact_summary=d.impact_summary,
        self_assessment=d.self_assessment,
        completion_explanation=d.completion_explanation,
        linked_publication_ids=d.linked_publication_ids or [],
        attachments_metadata=d.attachments_metadata or [],
        status=d.status,
        revision_reason=d.revision_reason,
        final_verdict=d.final_verdict,
        finalized_by=d.finalized_by,
        finalized_by_name=finalized_by_name,
        finalized_at=d.finalized_at,
        finalize_note=d.finalize_note,
        submitted_at=d.submitted_at,
        updated_at=d.updated_at,
        created_at=d.created_at,
        status_history=history_items,
    )


def _load_dossier(db: Session, dossier_id: UUID) -> AcceptanceDossier:
    d = (
        db.query(AcceptanceDossier)
        .options(
            joinedload(AcceptanceDossier.proposal),
            joinedload(AcceptanceDossier.submitter),
            joinedload(AcceptanceDossier.finalizer),
            joinedload(AcceptanceDossier.status_history),
            joinedload(AcceptanceDossier.acceptance_reviews).joinedload(AcceptanceReview.reviewer),
        )
        .filter(AcceptanceDossier.id == dossier_id)
        .first()
    )
    if not d:
        raise NotFoundException("Hồ sơ nghiệm thu")
    return d


def _log(db: Session, dossier: AcceptanceDossier, from_s: str, to_s: str, action: str, actor_id: UUID, note: str = None):
    db.add(AcceptanceDossierHistory(
        dossier_id=dossier.id,
        from_status=from_s,
        to_status=to_s,
        action=action,
        actor_id=actor_id,
        note=note,
    ))


def _log_proposal(db, proposal, from_s, to_s, action, actor_id, note=None):
    db.add(ProposalStatusHistory(
        proposal_id=proposal.id,
        from_status=from_s,
        to_status=to_s,
        action=action,
        actor_id=actor_id,
        note=note,
    ))


# ══════════════════════════════════════════════════════════════════
# FACULTY — Create / Save Draft
# ══════════════════════════════════════════════════════════════════

@router.post("/proposals/{proposal_id}", response_model=AcceptanceDossierResponse, status_code=201)
async def create_dossier(
    proposal_id: UUID,
    body: AcceptanceDossierCreate,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty creates a new acceptance dossier (starts as DRAFT)."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise NotFoundException("Đề tài")
    if proposal.pi_id != current_user.id:
        raise ForbiddenException()

    # Proposal must be in an eligible state
    allowed = {"IN_PROGRESS", "COMPLETED", "ACCEPTED"}
    if proposal.status not in allowed:
        raise BadRequestException(
            f"Chỉ có thể nộp nghiệm thu khi đề tài đang thực hiện hoặc đã hoàn thành (trạng thái hiện tại: {proposal.status})"
        )

    existing = db.query(AcceptanceDossier).filter(AcceptanceDossier.proposal_id == proposal_id).first()
    if existing:
        raise BadRequestException("Hồ sơ nghiệm thu đã tồn tại. Dùng endpoint cập nhật.")

    linked_ids = [str(uid) for uid in (body.linked_publication_ids or [])]

    dossier = AcceptanceDossier(
        proposal_id=proposal_id,
        submitted_by=current_user.id,
        final_report=body.final_report,
        achievements=body.achievements,
        deliverables=body.deliverables,
        impact_summary=body.impact_summary,
        self_assessment=body.self_assessment,
        completion_explanation=body.completion_explanation,
        linked_publication_ids=linked_ids,
        attachments_metadata=body.attachments_metadata or [],
        status="DRAFT",
    )
    db.add(dossier)
    db.flush()
    _log(db, dossier, None, "DRAFT", "create_dossier", current_user.id)
    db.commit()
    return _dossier_to_resp(_load_dossier(db, dossier.id))


@router.put("/{dossier_id}", response_model=AcceptanceDossierResponse)
async def update_dossier(
    dossier_id: UUID,
    body: AcceptanceDossierUpdate,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty updates a DRAFT or REVISION_REQUESTED dossier."""
    dossier = _load_dossier(db, dossier_id)
    if dossier.submitted_by != current_user.id:
        raise ForbiddenException()
    if dossier.status not in FACULTY_EDITABLE:
        raise BadRequestException(f"Không thể sửa hồ sơ ở trạng thái {dossier.status}")

    data = body.model_dump(exclude_unset=True)
    if "linked_publication_ids" in data and data["linked_publication_ids"] is not None:
        data["linked_publication_ids"] = [str(uid) for uid in data["linked_publication_ids"]]
    for field, val in data.items():
        setattr(dossier, field, val)
    db.commit()
    return _dossier_to_resp(_load_dossier(db, dossier_id))


@router.post("/{dossier_id}/submit", response_model=AcceptanceDossierResponse)
async def submit_dossier(
    dossier_id: UUID,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty officially submits the dossier for staff review."""
    dossier = _load_dossier(db, dossier_id)
    if dossier.submitted_by != current_user.id:
        raise ForbiddenException()
    if dossier.status not in FACULTY_EDITABLE:
        raise BadRequestException(f"Hồ sơ phải ở trạng thái DRAFT hoặc REVISION_REQUESTED để nộp")

    old = dossier.status
    dossier.status = "SUBMITTED"
    dossier.submitted_at = datetime.now(timezone.utc)
    dossier.revision_reason = None

    proposal = db.query(Proposal).filter(Proposal.id == dossier.proposal_id).first()
    if proposal:
        old_prop = proposal.status
        proposal.status = "ACCEPTANCE_SUBMITTED"
        _log_proposal(db, proposal, old_prop, "ACCEPTANCE_SUBMITTED",
                      "resubmit_acceptance" if old == "REVISION_REQUESTED" else "submit_acceptance",
                      current_user.id)

    _log(db, dossier, old, "SUBMITTED",
         "resubmit" if old == "REVISION_REQUESTED" else "submit", current_user.id)
    db.commit()
    return _dossier_to_resp(_load_dossier(db, dossier_id))


# ══════════════════════════════════════════════════════════════════
# FACULTY — Get own dossiers
# ══════════════════════════════════════════════════════════════════

@router.get("/my", response_model=AcceptanceDossierListResponse)
async def list_my_dossiers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty lists their own acceptance dossiers."""
    q = (
        db.query(AcceptanceDossier)
        .options(
            joinedload(AcceptanceDossier.proposal),
            joinedload(AcceptanceDossier.submitter),
            joinedload(AcceptanceDossier.finalizer),
            joinedload(AcceptanceDossier.status_history),
        )
        .filter(AcceptanceDossier.submitted_by == current_user.id)
    )
    total = q.count()
    items = q.order_by(AcceptanceDossier.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return AcceptanceDossierListResponse(
        items=[_dossier_to_resp(d) for d in items],
        total=total, page=page, size=size,
    )


@router.get("/proposals/{proposal_id}", response_model=AcceptanceDossierResponse)
async def get_dossier_by_proposal(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get dossier for a proposal (PI or staff/leadership)."""
    dossier = (
        db.query(AcceptanceDossier)
        .options(
            joinedload(AcceptanceDossier.proposal),
            joinedload(AcceptanceDossier.submitter),
            joinedload(AcceptanceDossier.finalizer),
            joinedload(AcceptanceDossier.status_history),
            joinedload(AcceptanceDossier.acceptance_reviews).joinedload(AcceptanceReview.reviewer),
        )
        .filter(AcceptanceDossier.proposal_id == proposal_id)
        .first()
    )
    if not dossier:
        raise NotFoundException("Hồ sơ nghiệm thu")

    if current_user.role == "FACULTY" and dossier.submitted_by != current_user.id:
        raise ForbiddenException()

    return _dossier_to_resp(dossier)


@router.get("/{dossier_id}", response_model=AcceptanceDossierResponse)
async def get_dossier(
    dossier_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single dossier by ID."""
    dossier = _load_dossier(db, dossier_id)
    if current_user.role == "FACULTY" and dossier.submitted_by != current_user.id:
        raise ForbiddenException()
    return _dossier_to_resp(dossier)


# ══════════════════════════════════════════════════════════════════
# STAFF — Manage + Validate Dossiers
# ══════════════════════════════════════════════════════════════════

@router.get("", response_model=AcceptanceDossierListResponse)
async def list_all_dossiers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN", "REVIEWER")),
    db: Session = Depends(get_db),
):
    """List all acceptance dossiers (STAFF/LEADERSHIP/REVIEWER)."""
    q = (
        db.query(AcceptanceDossier)
        .options(
            joinedload(AcceptanceDossier.proposal),
            joinedload(AcceptanceDossier.submitter),
            joinedload(AcceptanceDossier.finalizer),
            joinedload(AcceptanceDossier.status_history),
        )
    )
    if status:
        q = q.filter(AcceptanceDossier.status == status)
    if search:
        from app.models.proposal import Proposal as PropModel
        q = q.join(PropModel, AcceptanceDossier.proposal_id == PropModel.id).filter(
            PropModel.title.ilike(f"%{search}%")
        )
    # REVIEWER only sees UNDER_REVIEW dossiers assigned to them
    if current_user.role == "REVIEWER":
        review_dossier_ids = (
            db.query(AcceptanceReview.dossier_id)
            .filter(AcceptanceReview.reviewer_id == current_user.id)
            .subquery()
        )
        q = q.filter(AcceptanceDossier.id.in_(review_dossier_ids))

    total = q.count()
    items = q.order_by(AcceptanceDossier.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return AcceptanceDossierListResponse(
        items=[_dossier_to_resp(d) for d in items],
        total=total, page=page, size=size,
    )


@router.post("/{dossier_id}/validate", response_model=AcceptanceDossierResponse)
async def validate_dossier(
    dossier_id: UUID,
    body: AcceptanceDossierValidate,
    current_user: User = Depends(require_roles("STAFF")),
    db: Session = Depends(get_db),
):
    """Staff approves (→ UNDER_REVIEW) or returns (→ REVISION_REQUESTED) the dossier."""
    dossier = _load_dossier(db, dossier_id)
    if dossier.status != "SUBMITTED":
        raise BadRequestException("Hồ sơ phải ở trạng thái SUBMITTED để kiểm tra")

    old = dossier.status
    proposal = db.query(Proposal).filter(Proposal.id == dossier.proposal_id).first()

    if body.action == "APPROVE":
        reviews = db.query(AcceptanceReview).filter(
            AcceptanceReview.dossier_id == dossier_id
        ).all()

        if not reviews:
            raise BadRequestException("Chưa có phản biện, không thể duyệt")

        if any(r.status != "SUBMITTED" for r in reviews):
            raise BadRequestException("Phản biện chưa hoàn thành, không thể duyệt")


        dossier.status = "UNDER_REVIEW"
        dossier.revision_reason = None
        _log(db, dossier, old, "UNDER_REVIEW", "staff_approve", current_user.id)
        if proposal:
            _log_proposal(db, proposal, proposal.status, "ACCEPTANCE_UNDER_REVIEW", "acceptance_validated", current_user.id)
            proposal.status = "ACCEPTANCE_UNDER_REVIEW"
    else:  # RETURN
        if not body.reason:
            raise BadRequestException("Phải cung cấp lý do trả về")
        dossier.status = "REVISION_REQUESTED"
        dossier.revision_reason = body.reason
        _log(db, dossier, old, "REVISION_REQUESTED", "staff_return", current_user.id, note=body.reason)
        if proposal:
            _log_proposal(db, proposal, proposal.status, "ACCEPTANCE_REVISION_REQUESTED", "acceptance_returned", current_user.id, note=body.reason)
            proposal.status = "ACCEPTANCE_REVISION_REQUESTED"

    db.commit()
    return _dossier_to_resp(_load_dossier(db, dossier_id))


# ══════════════════════════════════════════════════════════════════
# REVIEWER — Score / Review dossier
# ══════════════════════════════════════════════════════════════════

@router.get("/my-reviews/list", response_model=List[AcceptanceReviewResponse])
async def my_acceptance_reviews(
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Get all acceptance reviews assigned to the current reviewer."""
    reviews = (
        db.query(AcceptanceReview)
        .options(joinedload(AcceptanceReview.reviewer))
        .filter(AcceptanceReview.reviewer_id == current_user.id)
        .all()
    )
    return [_acc_review_to_resp(r) for r in reviews]


@router.post("/{dossier_id}/reviews", response_model=AcceptanceReviewResponse, status_code=201)
async def submit_acceptance_review(
    dossier_id: UUID,
    body: AcceptanceReviewSubmit,
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Reviewer submits their score and verdict for a dossier."""
    dossier = _load_dossier(db, dossier_id)
    if dossier.status != "UNDER_REVIEW":
        raise BadRequestException("Hồ sơ phải ở trạng thái UNDER_REVIEW để chấm điểm")

    review = db.query(AcceptanceReview).filter(
        AcceptanceReview.dossier_id == dossier_id,
        AcceptanceReview.council_id == body.council_id,
        AcceptanceReview.reviewer_id == current_user.id,
    ).first()
    if not review:
        raise NotFoundException("Phân công nghiệm thu")
    if review.status == "SUBMITTED":
        raise BadRequestException("Bạn đã nộp đánh giá nghiệm thu này rồi")

    review.score = body.score
    review.verdict = body.verdict
    review.comments = body.comments
    review.status = "SUBMITTED"
    review.reviewed_at = datetime.now(timezone.utc)

    # Auto-complete council when all reviewers are done
    all_reviews = db.query(AcceptanceReview).filter(AcceptanceReview.council_id == body.council_id).all()
    all_done = all(r.status == "SUBMITTED" or r.id == review.id for r in all_reviews)
    if all_done:
        council = db.query(Council).filter(Council.id == body.council_id).first()
        if council and council.status == "ACTIVE":
            council.status = "COMPLETED"
        # Transition dossier → REVIEWED
        old = dossier.status
        dossier.status = "REVIEWED"
        _log(db, dossier, old, "REVIEWED", "all_reviews_done", current_user.id)

    db.commit()
    review = (
        db.query(AcceptanceReview)
        .options(joinedload(AcceptanceReview.reviewer))
        .filter(AcceptanceReview.id == review.id)
        .first()
    )
    return _acc_review_to_resp(review)


@router.get("/{dossier_id}/reviews", response_model=List[AcceptanceReviewResponse])
async def list_acceptance_reviews(
    dossier_id: UUID,
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN", "REVIEWER")),
    db: Session = Depends(get_db),
):
    """List all acceptance reviews for a dossier."""
    reviews = (
        db.query(AcceptanceReview)
        .options(joinedload(AcceptanceReview.reviewer))
        .filter(AcceptanceReview.dossier_id == dossier_id)
        .all()
    )
    return [_acc_review_to_resp(r) for r in reviews]


# ══════════════════════════════════════════════════════════════════
# LEADERSHIP — Finalize result
# ══════════════════════════════════════════════════════════════════

@router.post("/{dossier_id}/finalize", response_model=AcceptanceDossierResponse)
async def finalize_acceptance(
    dossier_id: UUID,
    body: AcceptanceFinalizeAction,
    current_user: User = Depends(require_roles("LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Leadership finalizes the acceptance result and updates proposal status."""
    dossier = _load_dossier(db, dossier_id)
    if dossier.status not in ("REVIEWED", "UNDER_REVIEW", "SUBMITTED"):
        raise BadRequestException(
            f"Hồ sơ phải ở trạng thái REVIEWED, UNDER_REVIEW, hoặc SUBMITTED để xác nhận kết quả (hiện tại: {dossier.status})"
        )

    old = dossier.status
    dossier.final_verdict = body.verdict
    dossier.finalized_by = current_user.id
    dossier.finalized_at = datetime.now(timezone.utc)
    dossier.finalize_note = body.note

    # Map verdict → dossier status & proposal status
    if body.verdict == "revise_required":
        dossier.status = "REVISION_REQUESTED"
        dossier.revision_reason = body.note
        prop_status = "ACCEPTANCE_REVISION_REQUESTED"
        prop_action = "acceptance_revision_required"
    elif body.verdict == "fail":
        dossier.status = "FAILED"
        prop_status = "ACCEPTANCE_FAILED"
        prop_action = "acceptance_failed"
    else:
        # excellent | good | pass → accepted
        dossier.status = "ACCEPTED"
        prop_status = "COMPLETED"
        prop_action = "acceptance_accepted"

    _log(db, dossier, old, dossier.status, "finalize", current_user.id, note=f"Kết quả: {body.verdict}")

    proposal = db.query(Proposal).filter(Proposal.id == dossier.proposal_id).first()
    if proposal:
        old_prop = proposal.status
        proposal.status = prop_status
        _log_proposal(db, proposal, old_prop, prop_status, prop_action, current_user.id, note=body.note)

    db.commit()
    return _dossier_to_resp(_load_dossier(db, dossier_id))


# ══════════════════════════════════════════════════════════════════
# PUBLICATIONS — linked to a proposal
# ══════════════════════════════════════════════════════════════════

@router.get("/proposals/{proposal_id}/publications")
async def get_proposal_publications(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get publications linked to a proposal."""
    pubs = (
        db.query(Publication)
        .filter(Publication.proposal_id == proposal_id)
        .all()
    )
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "journal_name": p.journal_name,
            "doi": p.doi,
            "pub_type": p.pub_type,
            "published_date": p.published_date.isoformat() if p.published_date else None,
            "indexing": p.indexing,
            "authors_text": p.authors_text,
            "status": p.status,
        }
        for p in pubs
    ]


# ══════════════════════════════════════════════════════════════════
# DASHBOARD — Staff overview
# ══════════════════════════════════════════════════════════════════

@router.get("/dashboard/stats")
async def acceptance_dashboard(
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Dashboard statistics for acceptance management."""
    total = db.query(AcceptanceDossier).count()
    by_status = {}
    for s in ("DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVIEWED", "ACCEPTED", "FAILED", "REVISION_REQUESTED"):
        by_status[s] = db.query(AcceptanceDossier).filter(AcceptanceDossier.status == s).count()

    by_verdict = {}
    for v in ("excellent", "good", "pass", "fail", "revise_required"):
        by_verdict[v] = db.query(AcceptanceDossier).filter(AcceptanceDossier.final_verdict == v).count()

    return {
        "total": total,
        "by_status": by_status,
        "by_verdict": by_verdict,
        "pending_submission": by_status.get("SUBMITTED", 0),
        "under_review": by_status.get("UNDER_REVIEW", 0),
        "finalized": by_status.get("ACCEPTED", 0) + by_status.get("FAILED", 0),
    }


# ── Helper: acceptance review response ────────────────────────────

def _acc_review_to_resp(r: AcceptanceReview) -> AcceptanceReviewResponse:
    return AcceptanceReviewResponse(
        id=r.id,
        dossier_id=r.dossier_id,
        council_id=r.council_id,
        reviewer_id=r.reviewer_id,
        reviewer_name=r.reviewer.full_name if r.reviewer else None,
        score=r.score,
        comments=r.comments,
        verdict=r.verdict,
        status=r.status,
        reviewed_at=r.reviewed_at,
        created_at=r.created_at,
    )
