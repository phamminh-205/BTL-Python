"""Progress Management API — full CRUD, review workflow, overdue detection, and timeline."""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.proposal import Proposal, ProposalStatusHistory
from app.models.progress import ProgressReport
from app.schemas import (
    ProgressCreate, ProgressUpdate, ProgressResponse, ProgressListResponse,
    ProgressReviewAction, ProgressDetailResponse, ProjectTimelineResponse,
    DashboardFacultyProgressResponse, DashboardStaffProgressResponse,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException

router = APIRouter(prefix="/progress", tags=["Progress Management"])


# ── Helpers ────────────────────────────────────────────────────────

VALID_STATUSES = {"SUBMITTED", "ACCEPTED", "NEEDS_REVISION", "DELAYED"}


def _progress_to_resp(r: ProgressReport, detail: bool = False) -> ProgressResponse:
    base = ProgressResponse(
        id=r.id,
        proposal_id=r.proposal_id,
        proposal_title=r.proposal.title if r.proposal else None,
        submitted_by=r.submitted_by,
        submitted_by_name=r.submitted_by_user.full_name if r.submitted_by_user else None,
        report_order=r.report_order,
        report_period=r.report_period,
        content=r.content,
        products_created=r.products_created,
        completion_pct=r.completion_pct,
        issues=r.issues,
        next_steps=r.next_steps,
        attachment_url=r.attachment_url,
        status=r.status,
        is_overdue=r.is_overdue,
        reviewed_by=r.reviewed_by,
        reviewed_by_name=r.reviewed_by_user.full_name if r.reviewed_by_user else None,
        reviewed_at=r.reviewed_at,
        review_note=r.review_note,
        submitted_at=r.submitted_at,
    )
    return base


def _flag_overdue_for_proposal(db: Session, proposal: Proposal):
    """Mark reports as overdue if completion_pct has not increased in >30 days."""
    reports = (
        db.query(ProgressReport)
        .filter(ProgressReport.proposal_id == proposal.id)
        .order_by(ProgressReport.report_order.desc())
        .all()
    )
    if not reports:
        return
    latest = reports[0]
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    if latest.submitted_at < cutoff and latest.status == "SUBMITTED" and float(latest.completion_pct) < 100:
        if not latest.is_overdue:
            latest.is_overdue = True
            db.add(latest)


def _load_report(db: Session, report_id: UUID) -> ProgressReport:
    r = (
        db.query(ProgressReport)
        .options(
            joinedload(ProgressReport.submitted_by_user),
            joinedload(ProgressReport.reviewed_by_user),
            joinedload(ProgressReport.proposal),
        )
        .filter(ProgressReport.id == report_id)
        .first()
    )
    if not r:
        raise NotFoundException("Báo cáo tiến độ")
    return r


# ══════════════════════════════════════════════════════════════════
# FACULTY — Submit progress report
# ══════════════════════════════════════════════════════════════════

@router.post("/proposals/{proposal_id}", response_model=ProgressResponse, status_code=201)
async def submit_progress(
    proposal_id: UUID,
    body: ProgressCreate,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Submit a progress report for an approved/in-progress proposal (PI only)."""
    proposal = (
        db.query(Proposal)
        .options(joinedload(Proposal.progress_reports))
        .filter(Proposal.id == proposal_id)
        .first()
    )
    if not proposal:
        raise NotFoundException("Đề tài")
    if proposal.pi_id != current_user.id:
        raise ForbiddenException()
    if proposal.status not in ("APPROVED", "IN_PROGRESS"):
        raise BadRequestException(
            "Chỉ có thể nộp báo cáo tiến độ khi đề tài đã được phê duyệt hoặc đang thực hiện"
        )

    # Transition APPROVED → IN_PROGRESS on first report
    if proposal.status == "APPROVED":
        proposal.status = "IN_PROGRESS"
        db.add(ProposalStatusHistory(
            proposal_id=proposal.id,
            from_status="APPROVED",
            to_status="IN_PROGRESS",
            action="start_progress",
            actor_id=current_user.id,
        ))

    last = (
        db.query(ProgressReport)
        .filter(ProgressReport.proposal_id == proposal_id)
        .order_by(ProgressReport.report_order.desc())
        .first()
    )
    next_order = (last.report_order + 1) if last else 1

    if last and float(body.completion_pct) < float(last.completion_pct):
        raise BadRequestException(
            f"Phần trăm hoàn thành không được giảm (báo cáo trước: {last.completion_pct}%)"
        )

    report = ProgressReport(
        proposal_id=proposal_id,
        submitted_by=current_user.id,
        report_order=next_order,
        report_period=body.report_period,
        content=body.content,
        products_created=body.products_created,
        completion_pct=body.completion_pct,
        issues=body.issues,
        next_steps=body.next_steps,
        attachment_url=body.attachment_url,
    )
    db.add(report)
    db.commit()

    report = _load_report(db, report.id)
    return _progress_to_resp(report)


@router.get("/proposals/{proposal_id}", response_model=List[ProgressResponse])
async def list_proposal_progress(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all progress reports for a proposal."""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise NotFoundException("Đề tài")

    # FACULTY can only see their own proposals
    if current_user.role == "FACULTY":
        from app.models.proposal import ProposalMember
        is_member = db.query(ProposalMember).filter(
            ProposalMember.proposal_id == proposal_id,
            ProposalMember.user_id == current_user.id,
        ).first()
        if proposal.pi_id != current_user.id and not is_member:
            raise ForbiddenException()

    reports = (
        db.query(ProgressReport)
        .options(
            joinedload(ProgressReport.submitted_by_user),
            joinedload(ProgressReport.reviewed_by_user),
            joinedload(ProgressReport.proposal),
        )
        .filter(ProgressReport.proposal_id == proposal_id)
        .order_by(ProgressReport.report_order)
        .all()
    )
    return [_progress_to_resp(r) for r in reports]


@router.put("/reports/{report_id}", response_model=ProgressResponse)
async def update_progress(
    report_id: UUID,
    body: ProgressUpdate,
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Update a SUBMITTED report (PI only, before review)."""
    r = _load_report(db, report_id)
    if r.submitted_by != current_user.id:
        raise ForbiddenException()
    if r.status != "SUBMITTED":
        raise BadRequestException("Chỉ có thể sửa báo cáo ở trạng thái Đã nộp")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(r, field, val)
    db.commit()
    r = _load_report(db, report_id)
    return _progress_to_resp(r)


# ══════════════════════════════════════════════════════════════════
# STAFF — Review progress report
# ══════════════════════════════════════════════════════════════════

@router.post("/reports/{report_id}/review", response_model=ProgressResponse)
async def review_progress(
    report_id: UUID,
    body: ProgressReviewAction,
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Review a progress report: ACCEPTED | NEEDS_REVISION | DELAYED."""
    if body.status not in ("ACCEPTED", "NEEDS_REVISION", "DELAYED"):
        raise BadRequestException("Trạng thái không hợp lệ. Dùng: ACCEPTED, NEEDS_REVISION, DELAYED")

    r = _load_report(db, report_id)
    if r.status != "SUBMITTED":
        raise BadRequestException("Chỉ có thể review báo cáo ở trạng thái Đã nộp")

    r.status = body.status
    r.reviewed_by = current_user.id
    r.reviewed_at = datetime.now(timezone.utc)
    r.review_note = body.note
    if body.status == "DELAYED":
        r.is_overdue = True

    db.commit()
    r = _load_report(db, report_id)
    return _progress_to_resp(r)


# ══════════════════════════════════════════════════════════════════
# STAFF — List all progress reports (monitoring board)
# ══════════════════════════════════════════════════════════════════

@router.get("", response_model=ProgressListResponse)
async def list_all_progress(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    proposal_id: Optional[UUID] = Query(None),
    overdue_only: bool = Query(False),
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """List all progress reports (STAFF/LEADERSHIP). Supports filtering."""
    q = (
        db.query(ProgressReport)
        .options(
            joinedload(ProgressReport.submitted_by_user),
            joinedload(ProgressReport.reviewed_by_user),
            joinedload(ProgressReport.proposal),
        )
    )
    if status:
        q = q.filter(ProgressReport.status == status)
    if proposal_id:
        q = q.filter(ProgressReport.proposal_id == proposal_id)
    if overdue_only:
        q = q.filter(ProgressReport.is_overdue == True)

    total = q.count()
    reports = q.order_by(ProgressReport.submitted_at.desc()).offset((page - 1) * size).limit(size).all()
    return ProgressListResponse(
        items=[_progress_to_resp(r) for r in reports],
        total=total, page=page, size=size,
    )


@router.get("/overdue", response_model=ProgressListResponse)
async def list_overdue_progress(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """List all overdue progress reports."""
    # Auto-flag overdue for active proposals
    active_proposals = db.query(Proposal).filter(Proposal.status == "IN_PROGRESS").all()
    for p in active_proposals:
        _flag_overdue_for_proposal(db, p)
    db.commit()

    q = (
        db.query(ProgressReport)
        .options(
            joinedload(ProgressReport.submitted_by_user),
            joinedload(ProgressReport.reviewed_by_user),
            joinedload(ProgressReport.proposal),
        )
        .filter(ProgressReport.is_overdue == True)
    )
    total = q.count()
    reports = q.order_by(ProgressReport.submitted_at.asc()).offset((page - 1) * size).limit(size).all()
    return ProgressListResponse(
        items=[_progress_to_resp(r) for r in reports],
        total=total, page=page, size=size,
    )


@router.get("/reports/{report_id}", response_model=ProgressResponse)
async def get_progress_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single progress report by ID."""
    r = _load_report(db, report_id)

    if current_user.role == "FACULTY":
        if r.submitted_by != current_user.id:
            raise ForbiddenException()

    return _progress_to_resp(r)


# ══════════════════════════════════════════════════════════════════
# TIMELINE — Project timeline endpoint
# ══════════════════════════════════════════════════════════════════

@router.get("/proposals/{proposal_id}/timeline", response_model=ProjectTimelineResponse)
async def get_project_timeline(
    proposal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full project timeline: status history + progress reports."""
    proposal = (
        db.query(Proposal)
        .options(
            joinedload(Proposal.status_history),
            joinedload(Proposal.progress_reports).joinedload(ProgressReport.submitted_by_user),
            joinedload(Proposal.progress_reports).joinedload(ProgressReport.reviewed_by_user),
            joinedload(Proposal.progress_reports).joinedload(ProgressReport.proposal),
            joinedload(Proposal.principal_investigator),
        )
        .filter(Proposal.id == proposal_id)
        .first()
    )
    if not proposal:
        raise NotFoundException("Đề tài")

    # FACULTY permission check
    if current_user.role == "FACULTY":
        from app.models.proposal import ProposalMember
        is_member = db.query(ProposalMember).filter(
            ProposalMember.proposal_id == proposal_id,
            ProposalMember.user_id == current_user.id,
        ).first()
        if proposal.pi_id != current_user.id and not is_member:
            raise ForbiddenException()

    history_items = [
        {
            "type": "status_change",
            "from_status": h.from_status,
            "to_status": h.to_status,
            "action": h.action,
            "note": h.note,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
        }
        for h in proposal.status_history
    ]

    progress_items = [_progress_to_resp(r) for r in proposal.progress_reports]

    return ProjectTimelineResponse(
        proposal_id=proposal.id,
        proposal_title=proposal.title,
        proposal_status=proposal.status,
        pi_name=proposal.principal_investigator.full_name if proposal.principal_investigator else None,
        duration_months=proposal.duration_months,
        approved_at=proposal.approved_at,
        created_at=proposal.created_at,
        status_history=history_items,
        progress_reports=progress_items,
        total_reports=len(progress_items),
        latest_completion_pct=float(progress_items[-1].completion_pct) if progress_items else 0.0,
    )


# ══════════════════════════════════════════════════════════════════
# DASHBOARD stats
# ══════════════════════════════════════════════════════════════════

@router.get("/dashboard/faculty", response_model=DashboardFacultyProgressResponse)
async def faculty_dashboard_progress(
    current_user: User = Depends(require_roles("FACULTY")),
    db: Session = Depends(get_db),
):
    """Faculty dashboard: approved proposals + upcoming deadlines."""
    proposals = (
        db.query(Proposal)
        .filter(
            Proposal.pi_id == current_user.id,
            Proposal.status.in_(["APPROVED", "IN_PROGRESS"]),
        )
        .all()
    )

    items = []
    for p in proposals:
        reports = (
            db.query(ProgressReport)
            .filter(ProgressReport.proposal_id == p.id)
            .order_by(ProgressReport.report_order.desc())
            .all()
        )
        last_pct = float(reports[0].completion_pct) if reports else 0.0
        last_status = reports[0].status if reports else None
        total_reports = len(reports)

        # Calculate expected next report deadline (every 30 days from approved_at or last report)
        if reports:
            anchor = reports[0].submitted_at
        elif p.approved_at:
            anchor = p.approved_at
        else:
            anchor = p.created_at
        next_deadline = anchor + timedelta(days=30) if anchor else None

        items.append({
            "proposal_id": str(p.id),
            "proposal_title": p.title,
            "status": p.status,
            "total_reports": total_reports,
            "latest_completion_pct": last_pct,
            "last_report_status": last_status,
            "next_deadline": next_deadline.isoformat() if next_deadline else None,
            "is_overdue": next_deadline is not None and next_deadline < datetime.now(timezone.utc) and float(last_pct) < 100,
        })

    return DashboardFacultyProgressResponse(
        total_active_projects=len(proposals),
        items=items,
    )


@router.get("/dashboard/staff", response_model=DashboardStaffProgressResponse)
async def staff_dashboard_progress(
    current_user: User = Depends(require_roles("STAFF", "LEADERSHIP", "ADMIN")),
    db: Session = Depends(get_db),
):
    """Staff dashboard: overdue count + status breakdown."""
    # Auto-flag overdue
    active_proposals = db.query(Proposal).filter(Proposal.status == "IN_PROGRESS").all()
    for p in active_proposals:
        _flag_overdue_for_proposal(db, p)
    db.commit()

    total_in_progress = db.query(Proposal).filter(Proposal.status == "IN_PROGRESS").count()
    total_approved = db.query(Proposal).filter(Proposal.status == "APPROVED").count()
    total_overdue = db.query(ProgressReport).filter(ProgressReport.is_overdue == True).count()
    pending_review = db.query(ProgressReport).filter(ProgressReport.status == "SUBMITTED").count()

    status_counts = {}
    for status in ("SUBMITTED", "ACCEPTED", "NEEDS_REVISION", "DELAYED"):
        status_counts[status] = db.query(ProgressReport).filter(ProgressReport.status == status).count()

    return DashboardStaffProgressResponse(
        total_in_progress=total_in_progress,
        total_approved_not_started=total_approved,
        total_overdue_reports=total_overdue,
        pending_review_count=pending_review,
        status_breakdown=status_counts,
    )
