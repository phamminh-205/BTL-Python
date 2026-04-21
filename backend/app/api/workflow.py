"""Workflow endpoints: Reviews, Progress Reports, and Acceptance Dossiers."""

from datetime import datetime, timezone
from typing import List, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.proposal import Proposal, ProposalStatusHistory
from app.models.review import Review
from app.models.acceptance import AcceptanceDossier, AcceptanceReview
from app.models.council import Council
from app.schemas import (
    ReviewSubmit, ReviewResponse,
    AcceptanceSubmit, AcceptanceReturn, AcceptanceDossierResponse,
    AcceptanceReviewSubmit, AcceptanceReviewResponse,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

router = APIRouter(tags=["Workflow"])


def _log_proposal(db, proposal, from_s, to_s, action, actor_id):
    db.add(ProposalStatusHistory(
        proposal_id=proposal.id,
        from_status=from_s,
        to_status=to_s,
        action=action,
        actor_id=actor_id,
    ))


# ══════════════════════════════════════════════════════════════════
# REVIEWS (Proposal Review)
# ══════════════════════════════════════════════════════════════════

@router.post("/reviews", response_model=ReviewResponse, status_code=201)
async def submit_review(
    body: ReviewSubmit,
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Submit a review score. Auto-completes council → REVIEWED when all done."""
    review = (
        db.query(Review)
        .options(joinedload(Review.reviewer), joinedload(Review.proposal))
        .filter(
            Review.council_id == body.council_id,
            Review.proposal_id == body.proposal_id,
            Review.reviewer_id == current_user.id,
        )
        .first()
    )
    if not review:
        raise NotFoundException("Phân công phản biện")
    if review.status == "SUBMITTED":
        raise BadRequestException("Bạn đã nộp đánh giá cho đề tài này")

    review.score = body.score
    review.comments = body.comments
    review.verdict = body.verdict
    review.criteria_scores = body.criteria_scores
    review.status = "SUBMITTED"
    review.reviewed_at = datetime.now(timezone.utc)

    # Auto-complete council if all reviews submitted
    all_reviews = db.query(Review).filter(Review.council_id == body.council_id).all()
    all_done = all(r.status == "SUBMITTED" or r.id == review.id for r in all_reviews)
    if all_done:
        council = db.query(Council).filter(Council.id == body.council_id).first()
        if council and council.status == "ACTIVE":
            council.status = "COMPLETED"
            proposal = db.query(Proposal).filter(Proposal.id == body.proposal_id).first()
            if proposal and proposal.status == "UNDER_REVIEW":
                _log_proposal(db, proposal, "UNDER_REVIEW", "REVIEWED", "complete_review", current_user.id)
                proposal.status = "REVIEWED"

    db.commit()
    review = db.query(Review).options(joinedload(Review.reviewer), joinedload(Review.proposal)).filter(Review.id == review.id).first()
    return ReviewResponse(
        id=review.id, council_id=review.council_id, proposal_id=review.proposal_id,
        proposal_title=review.proposal.title if review.proposal else "N/A",
        reviewer_id=review.reviewer_id,
        reviewer_name=review.reviewer.full_name if review.reviewer else "N/A",
        score=review.score, comments=review.comments, verdict=review.verdict,
        criteria_scores=review.criteria_scores,
        status=review.status, reviewed_at=review.reviewed_at, created_at=review.created_at,
    )


@router.get("/reviews/reviewer-list", response_model=List[ReviewResponse])
async def my_reviews(
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Get all reviews assigned to the current reviewer."""
    reviews = (
        db.query(Review)
        .options(joinedload(Review.reviewer), joinedload(Review.proposal))
        .filter(Review.reviewer_id == current_user.id)
        .all()
    )
    
    return [
        ReviewResponse(
            id=r.id,
            council_id=r.council_id,
            proposal_id=r.proposal_id,
            proposal_title=getattr(r.proposal, 'title', 'N/A') if r.proposal else "N/A",
            reviewer_id=r.reviewer_id,
            reviewer_name=getattr(r.reviewer, 'full_name', 'N/A') if r.reviewer else "N/A",
            score=r.score,
            comments=r.comments,
            verdict=r.verdict,
            criteria_scores=r.criteria_scores,
            status=r.status,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at,
        )
        for r in reviews if r
    ]


@router.get("/reviews/proposal/{proposal_id}", response_model=List[ReviewResponse])
async def list_reviews_for_proposal(
    proposal_id: UUID,
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """List all reviews for a proposal (STAFF/LEADERSHIP)."""
    reviews = (
        db.query(Review)
        .options(joinedload(Review.reviewer), joinedload(Review.proposal))
        .filter(Review.proposal_id == proposal_id)
        .all()
    )
    return [
        ReviewResponse(
            id=r.id, council_id=r.council_id, proposal_id=r.proposal_id,
            proposal_title=r.proposal.title if r.proposal else "N/A",
            reviewer_id=r.reviewer_id,
            reviewer_name=r.reviewer.full_name if r.reviewer else "N/A",
            score=r.score, comments=r.comments, verdict=r.verdict,
            criteria_scores=r.criteria_scores,
            status=r.status, reviewed_at=r.reviewed_at, created_at=r.created_at,
        )
        for r in reviews
    ]



# Note: Progress report endpoints moved to api/progress.py


# ══════════════════════════════════════════════════════════════════
# ACCEPTANCE
# ══════════════════════════════════════════════════════════════════

@router.post("/acceptance/proposals/{proposal_id}", response_model=AcceptanceDossierResponse, status_code=201)
async def submit_dossier(
    proposal_id: UUID,
    body: AcceptanceSubmit,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty submits acceptance dossier. T10."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise NotFoundException("Đề tài")
    if proposal.pi_id != current_user.id:
        raise ForbiddenException()
    if proposal.status not in ("IN_PROGRESS", "ACCEPTANCE_REVISION_REQUESTED"):
        raise BadRequestException("Đề tài phải đang thực hiện hoặc yêu cầu bổ sung nghiệm thu")

    existing = db.query(AcceptanceDossier).filter(AcceptanceDossier.proposal_id == proposal_id).first()
    if existing and proposal.status == "IN_PROGRESS":
        raise BadRequestException("Hồ sơ nghiệm thu đã tồn tại")

    if existing:
        existing.final_report = body.final_report
        existing.achievements = body.achievements
        existing.deliverables = body.deliverables
        existing.status = "SUBMITTED"
        existing.revision_reason = None
        existing.submitted_at = datetime.now(timezone.utc)
        dossier = existing
    else:
        dossier = AcceptanceDossier(
            proposal_id=proposal_id, submitted_by=current_user.id,
            final_report=body.final_report, achievements=body.achievements,
            deliverables=body.deliverables,
        )
        db.add(dossier)

    old_status = proposal.status
    action = "resubmit_acceptance" if existing else "submit_acceptance"
    proposal.status = "ACCEPTANCE_SUBMITTED"
    _log_proposal(db, proposal, old_status, "ACCEPTANCE_SUBMITTED", action, current_user.id)
    db.commit()

    user = db.query(User).filter(User.id == dossier.submitted_by).first()
    return _dossier_to_resp(dossier, user)


@router.get("/acceptance/proposals/{proposal_id}", response_model=AcceptanceDossierResponse)
async def get_dossier(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get acceptance dossier for a proposal."""
    dossier = db.query(AcceptanceDossier).filter(AcceptanceDossier.proposal_id == proposal_id).first()
    if not dossier:
        raise NotFoundException("Hồ sơ nghiệm thu")
    user = db.query(User).filter(User.id == dossier.submitted_by).first()
    return _dossier_to_resp(dossier, user)


@router.post("/acceptance/proposals/{proposal_id}/return", response_model=AcceptanceDossierResponse)
async def return_dossier(
    proposal_id: UUID,
    body: AcceptanceReturn,
    current_user: User = Depends(require_roles("STAFF")),
    db: Session = Depends(get_db),
):
    """Staff returns acceptance dossier for revision. T12."""
    dossier = db.query(AcceptanceDossier).filter(AcceptanceDossier.proposal_id == proposal_id).first()
    if not dossier or dossier.status != "SUBMITTED":
        raise BadRequestException("Hồ sơ phải ở trạng thái Đã nộp")
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    dossier.status = "REVISION_REQUESTED"
    dossier.revision_reason = body.reason
    old = proposal.status
    proposal.status = "ACCEPTANCE_REVISION_REQUESTED"
    _log_proposal(db, proposal, old, "ACCEPTANCE_REVISION_REQUESTED", "return_acceptance", current_user.id)
    db.commit()
    user = db.query(User).filter(User.id == dossier.submitted_by).first()
    return _dossier_to_resp(dossier, user)


@router.post("/acceptance/{dossier_id}/reviews", response_model=AcceptanceReviewResponse, status_code=201)
async def submit_acceptance_review(
    dossier_id: UUID,
    body: AcceptanceReviewSubmit,
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Submit an acceptance review. Auto-completes council when all done."""
    review = db.query(AcceptanceReview).filter(
        AcceptanceReview.dossier_id == dossier_id,
        AcceptanceReview.council_id == body.council_id,
        AcceptanceReview.reviewer_id == current_user.id,
    ).first()
    if not review:
        raise NotFoundException("Phân công nghiệm thu")
    if review.status == "SUBMITTED":
        raise BadRequestException("Bạn đã nộp đánh giá nghiệm thu này")

    review.score = body.score
    review.verdict = body.verdict
    review.comments = body.comments
    review.status = "SUBMITTED"
    review.reviewed_at = datetime.now(timezone.utc)

    all_reviews = db.query(AcceptanceReview).filter(AcceptanceReview.council_id == body.council_id).all()
    if all(r.status == "SUBMITTED" or r.id == review.id for r in all_reviews):
        council = db.query(Council).filter(Council.id == body.council_id).first()
        if council and council.status == "ACTIVE":
            council.status = "COMPLETED"

    db.commit()
    review = db.query(AcceptanceReview).options(joinedload(AcceptanceReview.reviewer)).filter(AcceptanceReview.id == review.id).first()
    return _acc_review_to_resp(review)


@router.get("/acceptance/{dossier_id}/reviews", response_model=list[AcceptanceReviewResponse])
async def list_acceptance_reviews(
    dossier_id: UUID,
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
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


@router.get("/acceptance/my-reviews", response_model=list[AcceptanceReviewResponse])
async def my_acceptance_reviews(
    current_user: User = Depends(require_roles("REVIEWER")),
    db: Session = Depends(get_db),
):
    """Get acceptance reviews assigned to current reviewer."""
    reviews = (
        db.query(AcceptanceReview)
        .options(joinedload(AcceptanceReview.reviewer))
        .filter(AcceptanceReview.reviewer_id == current_user.id)
        .all()
    )
    return [_acc_review_to_resp(r) for r in reviews]


def _dossier_to_resp(dossier: AcceptanceDossier, user) -> AcceptanceDossierResponse:
    return AcceptanceDossierResponse(
        id=dossier.id, proposal_id=dossier.proposal_id, submitted_by=dossier.submitted_by,
        submitted_by_name=user.full_name if user else None,
        final_report=dossier.final_report, achievements=dossier.achievements,
        deliverables=dossier.deliverables, status=dossier.status,
        revision_reason=dossier.revision_reason,
        submitted_at=dossier.submitted_at, updated_at=dossier.updated_at,created_at=dossier.created_at,
    )


def _acc_review_to_resp(r: AcceptanceReview) -> AcceptanceReviewResponse:
    return AcceptanceReviewResponse(
        id=r.id, dossier_id=r.dossier_id, council_id=r.council_id,
        reviewer_id=r.reviewer_id,
        reviewer_name=r.reviewer.full_name if r.reviewer else None,
        score=r.score, comments=r.comments, verdict=r.verdict,
        status=r.status, reviewed_at=r.reviewed_at, created_at=r.created_at,
    )
