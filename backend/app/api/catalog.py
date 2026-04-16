"""Catalog endpoints: All basic catalogs with pagination, search and soft delete."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.catalog import (
    Department, ResearchField, ProposalCategory,
    EvaluationCriteriaTemplate, CouncilTypeCatalog, ProposalStatusCatalog
)
from app.models.proposal import Proposal
from app.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, DepartmentListResponse,
    ResearchFieldCreate, ResearchFieldUpdate, ResearchFieldResponse, ResearchFieldListResponse,
    ProposalCategoryCreate, ProposalCategoryUpdate, ProposalCategoryResponse, ProposalCategoryListResponse,
    EvaluationCriteriaCreate, EvaluationCriteriaUpdate, EvaluationCriteriaResponse, EvaluationCriteriaListResponse,
    CouncilTypeCatalogCreate, CouncilTypeCatalogUpdate, CouncilTypeCatalogResponse, CouncilTypeCatalogListResponse,
    ProposalStatusCatalogCreate, ProposalStatusCatalogUpdate, ProposalStatusCatalogResponse, ProposalStatusCatalogListResponse,
)
from app.core.dependencies import get_current_user, require_roles
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter(prefix="/catalog", tags=["Catalog"])


# ── Departments ──────────────────────────────────────────────────

@router.get("/departments", response_model=DepartmentListResponse)
async def list_departments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(Department)
    if search:
        query = query.filter((Department.name.ilike(f"%{search}%")) | (Department.code.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(Department.is_active == is_active)
    
    total = query.count()
    items = query.order_by(Department.name).offset((page - 1) * size).limit(size).all()
    return DepartmentListResponse(items=items, total=total, page=page, size=size)


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(body: DepartmentCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(Department).filter((Department.name == body.name) | (Department.code == body.code)).first():
        raise BadRequestException("Khoa/Phòng đã tồn tại")
    dept = Department(name=body.name, code=body.code)
    db.add(dept); db.commit(); db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: UUID, body: DepartmentUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept: raise NotFoundException("Khoa/Phòng")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(dept, f, v)
    db.commit(); db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept: raise NotFoundException("Khoa/Phòng")
    if db.query(Proposal).filter(Proposal.department_id == dept_id).first():
        raise BadRequestException("Không thể xóa Khoa/Phòng đang được tham chiếu trong Đề tài.")
    
    dept.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}


# ── Research Fields ──────────────────────────────────────────────

@router.get("/research-fields", response_model=ResearchFieldListResponse)
async def list_research_fields(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(ResearchField)
    if search:
        query = query.filter((ResearchField.name.ilike(f"%{search}%")) | (ResearchField.code.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(ResearchField.is_active == is_active)
    
    total = query.count()
    items = query.order_by(ResearchField.name).offset((page - 1) * size).limit(size).all()
    return ResearchFieldListResponse(items=items, total=total, page=page, size=size)


@router.post("/research-fields", response_model=ResearchFieldResponse, status_code=201)
async def create_research_field(body: ResearchFieldCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(ResearchField).filter((ResearchField.name == body.name) | (ResearchField.code == body.code)).first():
        raise BadRequestException("Lĩnh vực nghiên cứu đã tồn tại")
    field = ResearchField(name=body.name, code=body.code)
    db.add(field); db.commit(); db.refresh(field)
    return field


@router.put("/research-fields/{field_id}", response_model=ResearchFieldResponse)
async def update_research_field(field_id: UUID, body: ResearchFieldUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    field = db.query(ResearchField).filter(ResearchField.id == field_id).first()
    if not field: raise NotFoundException("Lĩnh vực nghiên cứu")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(field, f, v)
    db.commit(); db.refresh(field)
    return field


@router.delete("/research-fields/{field_id}")
async def delete_research_field(field_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    field = db.query(ResearchField).filter(ResearchField.id == field_id).first()
    if not field: raise NotFoundException("Lĩnh vực nghiên cứu")
    if db.query(Proposal).filter(Proposal.field_id == field_id).first():
        raise BadRequestException("Không thể xóa Lĩnh vực đang được tham chiếu trong Đề tài.")
    
    field.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}


# ── Proposal Categories ─────────────────────────────────────────

@router.get("/proposal-categories", response_model=ProposalCategoryListResponse)
async def list_proposal_categories(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(ProposalCategory)
    if search:
        query = query.filter((ProposalCategory.name.ilike(f"%{search}%")) | (ProposalCategory.code.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(ProposalCategory.is_active == is_active)
    
    total = query.count()
    items = query.order_by(ProposalCategory.name).offset((page - 1) * size).limit(size).all()
    return ProposalCategoryListResponse(items=items, total=total, page=page, size=size)


@router.post("/proposal-categories", response_model=ProposalCategoryResponse, status_code=201)
async def create_proposal_category(body: ProposalCategoryCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(ProposalCategory).filter((ProposalCategory.name == body.name) | (ProposalCategory.code == body.code)).first():
        raise BadRequestException("Loại đề tài đã tồn tại")
    cat = ProposalCategory(name=body.name, code=body.code, level=body.level,
                           max_duration_months=body.max_duration_months, description=body.description)
    db.add(cat); db.commit(); db.refresh(cat)
    return cat


@router.put("/proposal-categories/{cat_id}", response_model=ProposalCategoryResponse)
async def update_proposal_category(cat_id: UUID, body: ProposalCategoryUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    cat = db.query(ProposalCategory).filter(ProposalCategory.id == cat_id).first()
    if not cat: raise NotFoundException("Loại đề tài")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(cat, f, v)
    db.commit(); db.refresh(cat)
    return cat


@router.delete("/proposal-categories/{cat_id}")
async def delete_proposal_category(cat_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    cat = db.query(ProposalCategory).filter(ProposalCategory.id == cat_id).first()
    if not cat: raise NotFoundException("Loại đề tài")
    if db.query(Proposal).filter(Proposal.category_id == cat_id).first():
        raise BadRequestException("Không thể xóa Loại đề tài đang được tham chiếu trong Đề tài.")
    
    cat.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}


# ── Evaluation Criteria Templates ───────────────────────────────

@router.get("/evaluation-criteria", response_model=EvaluationCriteriaListResponse)
async def list_evaluation_criteria(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    query = db.query(EvaluationCriteriaTemplate)
    if search:
        query = query.filter(EvaluationCriteriaTemplate.name.ilike(f"%{search}%"))
    if is_active is not None:
        query = query.filter(EvaluationCriteriaTemplate.is_active == is_active)
    total = query.count()
    items = query.order_by(EvaluationCriteriaTemplate.name).offset((page - 1) * size).limit(size).all()
    return EvaluationCriteriaListResponse(items=items, total=total, page=page, size=size)


@router.post("/evaluation-criteria", response_model=EvaluationCriteriaResponse, status_code=201)
async def create_evaluation_criteria(body: EvaluationCriteriaCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(EvaluationCriteriaTemplate).filter(EvaluationCriteriaTemplate.name == body.name).first():
        raise BadRequestException("Mẫu đánh giá đã tồn tại")
    item = EvaluationCriteriaTemplate(**body.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/evaluation-criteria/{item_id}", response_model=EvaluationCriteriaResponse)
async def update_evaluation_criteria(item_id: UUID, body: EvaluationCriteriaUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(EvaluationCriteriaTemplate).filter(EvaluationCriteriaTemplate.id == item_id).first()
    if not item: raise NotFoundException("Mẫu đánh giá")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(item, f, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/evaluation-criteria/{item_id}")
async def delete_evaluation_criteria(item_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(EvaluationCriteriaTemplate).filter(EvaluationCriteriaTemplate.id == item_id).first()
    if not item: raise NotFoundException("Mẫu đánh giá")
    item.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}


# ── Council Type Catalogs ────────────────────────────────────────

@router.get("/council-types", response_model=CouncilTypeCatalogListResponse)
async def list_council_types(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    query = db.query(CouncilTypeCatalog)
    if search:
        query = query.filter((CouncilTypeCatalog.name.ilike(f"%{search}%")) | (CouncilTypeCatalog.code.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(CouncilTypeCatalog.is_active == is_active)
    total = query.count()
    items = query.order_by(CouncilTypeCatalog.name).offset((page - 1) * size).limit(size).all()
    return CouncilTypeCatalogListResponse(items=items, total=total, page=page, size=size)


@router.post("/council-types", response_model=CouncilTypeCatalogResponse, status_code=201)
async def create_council_type(body: CouncilTypeCatalogCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(CouncilTypeCatalog).filter((CouncilTypeCatalog.name == body.name) | (CouncilTypeCatalog.code == body.code)).first():
        raise BadRequestException("Loại hội đồng đã tồn tại")
    item = CouncilTypeCatalog(**body.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/council-types/{item_id}", response_model=CouncilTypeCatalogResponse)
async def update_council_type(item_id: UUID, body: CouncilTypeCatalogUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(CouncilTypeCatalog).filter(CouncilTypeCatalog.id == item_id).first()
    if not item: raise NotFoundException("Loại hội đồng")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(item, f, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/council-types/{item_id}")
async def delete_council_type(item_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(CouncilTypeCatalog).filter(CouncilTypeCatalog.id == item_id).first()
    if not item: raise NotFoundException("Loại hội đồng")
    item.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}


# ── Proposal Status Catalogs ──────────────────────────────────────

@router.get("/proposal-statuses", response_model=ProposalStatusCatalogListResponse)
async def list_proposal_statuses(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = None,
    is_active: bool = None,
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    query = db.query(ProposalStatusCatalog)
    if search:
        query = query.filter((ProposalStatusCatalog.name.ilike(f"%{search}%")) | (ProposalStatusCatalog.code.ilike(f"%{search}%")))
    if is_active is not None:
        query = query.filter(ProposalStatusCatalog.is_active == is_active)
    total = query.count()
    items = query.order_by(ProposalStatusCatalog.name).offset((page - 1) * size).limit(size).all()
    return ProposalStatusCatalogListResponse(items=items, total=total, page=page, size=size)


@router.post("/proposal-statuses", response_model=ProposalStatusCatalogResponse, status_code=201)
async def create_proposal_status(body: ProposalStatusCatalogCreate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    if db.query(ProposalStatusCatalog).filter((ProposalStatusCatalog.name == body.name) | (ProposalStatusCatalog.code == body.code)).first():
        raise BadRequestException("Trạng thái đề tài đã tồn tại")
    item = ProposalStatusCatalog(**body.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.put("/proposal-statuses/{item_id}", response_model=ProposalStatusCatalogResponse)
async def update_proposal_status(item_id: UUID, body: ProposalStatusCatalogUpdate, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(ProposalStatusCatalog).filter(ProposalStatusCatalog.id == item_id).first()
    if not item: raise NotFoundException("Trạng thái đề tài")
    for f, v in body.model_dump(exclude_unset=True).items(): setattr(item, f, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/proposal-statuses/{item_id}")
async def delete_proposal_status(item_id: UUID, current_user: User = Depends(require_roles("ADMIN", "STAFF")), db: Session = Depends(get_db)):
    item = db.query(ProposalStatusCatalog).filter(ProposalStatusCatalog.id == item_id).first()
    if not item: raise NotFoundException("Trạng thái đề tài")
    item.is_active = False
    db.commit()
    return {"message": "Đã xóa (vô hiệu hóa) thành công"}
