"""Seed realistic Vietnamese university data for demo purposes.

Seeds: roles, departments, research fields, proposal categories,
       approval steps, users, and registration periods.

Run standalone: python -m app.seed.seed_data
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.role import Role
from app.models.user import User
from app.models.catalog import Department, ResearchField, ProposalCategory, EvaluationCriteriaTemplate
from app.models.approval import ApprovalStep
from app.models.period import RegistrationPeriod
from app.core.security import hash_password
from datetime import date


def seed():
    """Insert seed data into the database."""
    # Create all tables if they don't exist (fallback if migrations not run)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Skip if data already exists
        if db.query(Role).first():
            print("⚠️  Database already has data, skipping seed.")
            return

        print("🌱 Seeding database...")

        # ── 1. Roles ─────────────────────────────────────────
        roles = {
            "ADMIN": Role(code="ADMIN", name="Quản trị viên", description="Quản trị hệ thống", sort_order=1),
            "STAFF": Role(code="STAFF", name="Phòng KHCN", description="Cán bộ Phòng Khoa học Công nghệ", sort_order=2),
            "LEADERSHIP": Role(code="LEADERSHIP", name="Lãnh đạo", description="Ban Giám hiệu / Lãnh đạo trường", sort_order=3),
            "FACULTY": Role(code="FACULTY", name="Giảng viên", description="Giảng viên / Nghiên cứu viên", sort_order=4),
            "REVIEWER": Role(code="REVIEWER", name="Phản biện", description="Thành viên hội đồng phản biện", sort_order=5),
        }
        db.add_all(roles.values())
        db.flush()
        print(f"  ✅ {len(roles)} roles")

        # ── 2. Departments ───────────────────────────────────
        departments = [
            Department(name="Khoa Công nghệ Thông tin", code="CNTT"),
            Department(name="Khoa Điện - Điện tử", code="DDE"),
            Department(name="Khoa Cơ khí", code="CK"),
            Department(name="Khoa Kinh tế", code="KT"),
            Department(name="Khoa Ngoại ngữ", code="NN"),
            Department(name="Khoa Khoa học Cơ bản", code="KHCB"),
            Department(name="Khoa Xây dựng", code="XD"),
            Department(name="Khoa Môi trường", code="MT"),
        ]
        db.add_all(departments)
        db.flush()
        print(f"  ✅ {len(departments)} departments")

        # ── 3. Research Fields ───────────────────────────────
        fields = [
            ResearchField(name="Trí tuệ nhân tạo", code="AI"),
            ResearchField(name="Internet vạn vật", code="IOT"),
            ResearchField(name="An toàn thông tin", code="ATTT"),
            ResearchField(name="Khoa học dữ liệu", code="DS"),
            ResearchField(name="Năng lượng tái tạo", code="NLTT"),
            ResearchField(name="Vật liệu tiên tiến", code="VLTT"),
            ResearchField(name="Kinh tế số", code="KTS"),
            ResearchField(name="Phát triển bền vững", code="PTBV"),
            ResearchField(name="Công nghệ sinh học", code="CNSH"),
            ResearchField(name="Tự động hóa", code="TDH"),
        ]
        db.add_all(fields)
        db.flush()
        print(f"  ✅ {len(fields)} research fields")

        # ── 4. Proposal Categories ───────────────────────────
        categories = [
            ProposalCategory(
                name="Đề tài cấp trường",
                code="CAP_TRUONG",
                level="UNIVERSITY",
                max_duration_months=12,
                description="Đề tài nghiên cứu khoa học cấp trường, tài trợ bởi ngân sách trường",
            ),
            ProposalCategory(
                name="Đề tài cấp khoa",
                code="CAP_KHOA",
                level="FACULTY",
                max_duration_months=6,
                description="Đề tài nghiên cứu cấp khoa/bộ môn",
            ),
            ProposalCategory(
                name="Đề tài cấp bộ",
                code="CAP_BO",
                level="MINISTERIAL",
                max_duration_months=24,
                description="Đề tài nghiên cứu cấp bộ/ngành",
            ),
        ]
        db.add_all(categories)
        db.flush()
        print(f"  ✅ {len(categories)} proposal categories")

        # ── 4.1 Evaluation Criteria Templates ───────────────
        templates = [
            EvaluationCriteriaTemplate(
                name="Tiêu chí đánh giá đề tài cấp trường",
                description="Dùng cho hội đồng phản biện đề tài nghiên cứu khoa học cấp trường",
                criteria_json=[
                    {"id": "c1", "label": "Tính cấp thiết và mục tiêu nghiên cứu", "max_score": 20},
                    {"id": "c2", "label": "Tổng quan tình hình nghiên cứu", "max_score": 15},
                    {"id": "c3", "label": "Phương pháp nghiên cứu", "max_score": 25},
                    {"id": "c4", "label": "Khả năng ứng dụng và hiệu quả", "max_score": 20},
                    {"id": "c5", "label": "Năng lực của nhóm nghiên cứu", "max_score": 20},
                ]
            ),
            EvaluationCriteriaTemplate(
                name="Tiêu chí đánh giá đề tài cấp khoa",
                description="Dùng cho hội đồng phản biện đề tài nghiên cứu khoa học cấp khoa",
                criteria_json=[
                    {"id": "k1", "label": "Ý tưởng và mục tiêu", "max_score": 30},
                    {"id": "k2", "label": "Nội dung nghiên cứu", "max_score": 40},
                    {"id": "k3", "label": "Kết quả dự kiến", "max_score": 30},
                ]
            )
        ]
        db.add_all(templates)
        db.flush()
        print(f"  ✅ {len(templates)} evaluation criteria templates")

        # ── 5. Approval Steps ────────────────────────────────
        steps = [
            ApprovalStep(
                step_code="STAFF_VALIDATE",
                step_name="Kiểm tra tính hợp lệ",
                required_role="STAFF",
                step_order=1,
            ),
            ApprovalStep(
                step_code="COUNCIL_REVIEW",
                step_name="Phản biện hội đồng",
                required_role="REVIEWER",
                step_order=2,
            ),
            ApprovalStep(
                step_code="LEADERSHIP_APPROVE",
                step_name="Phê duyệt lãnh đạo",
                required_role="LEADERSHIP",
                step_order=3,
            ),
        ]
        db.add_all(steps)
        db.flush()
        print(f"  ✅ {len(steps)} approval steps")

        # ── 6. Users ─────────────────────────────────────────
        default_pw = hash_password("password123")

        users = [
            # Admin
            User(
                email="admin@university.edu.vn",
                hashed_password=default_pw,
                full_name="Nguyễn Quản Trị",
                role_id=roles["ADMIN"].id,
                department_id=departments[0].id,
            ),
            # S&T Staff
            User(
                email="staff@university.edu.vn",
                hashed_password=default_pw,
                full_name="Trần Thị Phòng KHCN",
                role_id=roles["STAFF"].id,
                department_id=departments[0].id,
                phone="0901234567",
            ),
            User(
                email="staff2@university.edu.vn",
                hashed_password=default_pw,
                full_name="Lý Văn Khoa Học",
                role_id=roles["STAFF"].id,
                department_id=departments[0].id,
                phone="0901234568",
            ),
            # Leadership
            User(
                email="leader@university.edu.vn",
                hashed_password=default_pw,
                full_name="Phạm Văn Lãnh Đạo",
                role_id=roles["LEADERSHIP"].id,
                academic_rank="Giáo sư",
                academic_title="Tiến sĩ",
                department_id=departments[0].id,
                phone="0912345678",
            ),
            # Faculty members
            User(
                email="faculty1@university.edu.vn",
                hashed_password=default_pw,
                full_name="Lê Văn Nghiên Cứu",
                role_id=roles["FACULTY"].id,
                academic_rank="Phó Giáo sư",
                academic_title="Tiến sĩ",
                department_id=departments[0].id,
                phone="0923456789",
            ),
            User(
                email="faculty2@university.edu.vn",
                hashed_password=default_pw,
                full_name="Hoàng Thị Khoa Học",
                role_id=roles["FACULTY"].id,
                academic_rank="Giảng viên",
                academic_title="Thạc sĩ",
                department_id=departments[1].id,
                phone="0934567890",
            ),
            User(
                email="faculty3@university.edu.vn",
                hashed_password=default_pw,
                full_name="Ngô Minh Dữ Liệu",
                role_id=roles["FACULTY"].id,
                academic_rank="Giảng viên chính",
                academic_title="Tiến sĩ",
                department_id=departments[0].id,
                phone="0945678901",
            ),
            User(
                email="faculty4@university.edu.vn",
                hashed_password=default_pw,
                full_name="Đinh Thị Sáng Tạo",
                role_id=roles["FACULTY"].id,
                academic_rank="Giảng viên",
                academic_title="Thạc sĩ",
                department_id=departments[3].id,
                phone="0956789013",
            ),
            # Reviewers
            User(
                email="reviewer1@university.edu.vn",
                hashed_password=default_pw,
                full_name="Đặng Phản Biện",
                role_id=roles["REVIEWER"].id,
                academic_rank="Phó Giáo sư",
                academic_title="Tiến sĩ",
                department_id=departments[1].id,
                phone="0956789012",
            ),
            User(
                email="reviewer2@university.edu.vn",
                hashed_password=default_pw,
                full_name="Vũ Thị Đánh Giá",
                role_id=roles["REVIEWER"].id,
                academic_rank="Giáo sư",
                academic_title="Tiến sĩ",
                department_id=departments[2].id,
                phone="0967890123",
            ),
            User(
                email="reviewer3@university.edu.vn",
                hashed_password=default_pw,
                full_name="Bùi Chuyên Gia",
                role_id=roles["REVIEWER"].id,
                academic_rank="Phó Giáo sư",
                academic_title="Tiến sĩ",
                department_id=departments[0].id,
                phone="0978901234",
            ),
        ]
        db.add_all(users)
        db.flush()
        print(f"  ✅ {len(users)} users")

        # ── 7. Registration Periods ──────────────────────────
        periods = [
            RegistrationPeriod(
                title="Đợt đăng ký NCKH Học kỳ 1 — Năm học 2025-2026",
                description="Đợt đăng ký đề tài nghiên cứu khoa học cấp trường, học kỳ 1 năm học 2025-2026. Ưu tiên các đề tài ứng dụng AI và chuyển đổi số.",
                start_date=date(2026, 1, 15),
                end_date=date(2026, 6, 30),
                status="OPEN",
            ),
            RegistrationPeriod(
                title="Đợt đăng ký NCKH Học kỳ 2 — Năm học 2025-2026",
                description="Đợt đăng ký đề tài nghiên cứu khoa học cấp trường, học kỳ 2 năm học 2025-2026.",
                start_date=date(2026, 7, 1),
                end_date=date(2026, 12, 31),
                status="DRAFT",
            ),
        ]
        db.add_all(periods)
        db.flush()
        print(f"  ✅ {len(periods)} registration periods")

        # ── 8. Proposals ───────────────────────────────────────────
        from app.models.proposal import Proposal, ProposalStatusHistory
        from datetime import datetime, timezone
        import uuid

        mock_proposals = [
            Proposal(
                title="Nghiên cứu ứng dụng Trí tuệ nhân tạo trong chẩn đoán hình ảnh y khoa",
                summary="Đề tài tập trung vào việc sử dụng deep learning để phân tích X-Quang phổi...",
                objectives="Xây dựng mô hình CNN với độ chính xác >90%",
                methodology="Thu thập dữ liệu, huấn luyện mô hình ResNet50, thử nghiệm lâm sàng.",
                expected_outcomes="01 bài báo quốc tế, 01 phần mềm thử nghiệm",
                duration_months=12,
                budget_estimated=150000000,
                pi_id=users[4].id, # faculty1
                department_id=departments[0].id,
                field_id=fields[0].id,
                category_id=categories[0].id,
                period_id=periods[0].id,
                status="SUBMITTED",
                attachment_url="https://example.com/docs/ai-medical-proposal.pdf",
                submitted_at=datetime.now(timezone.utc)
            ),
            Proposal(
                title="Phát triển hệ thống IoT giám sát chất lượng không khí trong trường học",
                summary="Thiết kế và triển khai mạng lưới cảm biến IoT...",
                objectives="Đo lường PM2.5, CO2 theo thời gian thực",
                methodology="Sử dụng vi điều khiển ESP32 và giao thức MQTT.",
                expected_outcomes="Hệ thống phần cứng và dashboard giám sát",
                duration_months=6,
                budget_estimated=50000000,
                pi_id=users[5].id, # faculty2
                department_id=departments[1].id,
                field_id=fields[1].id,
                category_id=categories[1].id,
                period_id=periods[0].id,
                status="DRAFT",
            ),
            Proposal(
                title="Đánh giá tác động của kinh tế số đến các doanh nghiệp vừa và nhỏ",
                summary="Phân tích sự thay đổi trong mô hình kinh doanh khi áp dụng chuyển đổi số...",
                objectives="Đưa ra bộ chỉ số đánh giá mức độ sẵn sàng chuyển đổi số",
                methodology="Khảo sát định lượng và phỏng vấn chuyên sâu.",
                expected_outcomes="Báo cáo phân tích và cẩm nang hướng dẫn",
                duration_months=12,
                budget_estimated=80000000,
                pi_id=users[6].id, # faculty3
                department_id=departments[3].id,
                field_id=fields[6].id,
                category_id=categories[0].id,
                period_id=periods[0].id,
                status="REVISION_REQUESTED",
                revision_reason="Vui lòng bổ sung chi tiết phần phương pháp chọn mẫu khảo sát.",
                attachment_url="https://example.com/docs/kinh-te-so.docx",
            ),
            Proposal(
                title="Nghiên cứu vật liệu nano ứng dụng trong xử lý nước thải",
                summary="Tổng hợp vật liệu nano composit tiên tiến để hấp phụ kim loại nặng...",
                objectives="Tối ưu hóa quy trình tổng hợp và thử nghiệm hiệu suất",
                methodology="Phương pháp đồng kết tủa và đánh giá isotherm",
                expected_outcomes="01 quy trình công nghệ, 02 bài báo trong nước",
                duration_months=24,
                budget_estimated=300000000,
                pi_id=users[4].id, # faculty1
                department_id=departments[7].id,
                field_id=fields[5].id,
                category_id=categories[2].id,
                period_id=periods[0].id,
                status="VALIDATED",
                attachment_url="https://example.com/docs/vat-lieu-nano.pdf",
                submitted_at=datetime.now(timezone.utc)
            )
        ]
        db.add_all(mock_proposals)
        db.flush()
        print(f"  ✅ {len(mock_proposals)} proposals")

        db.commit()
        print()
        print("🎉 Seed data inserted successfully!")
        print()
        print("┌─────────────────────────────────────────────────┐")
        print("│  📋 Demo Accounts (password: password123)       │")
        print("├─────────────────────────────────────────────────┤")
        print("│  Admin:       admin@university.edu.vn           │")
        print("│  Staff:       staff@university.edu.vn           │")
        print("│  Leadership:  leader@university.edu.vn          │")
        print("│  Faculty:     faculty1@university.edu.vn        │")
        print("│  Faculty:     faculty2@university.edu.vn        │")
        print("│  Reviewer:    reviewer1@university.edu.vn       │")
        print("│  Reviewer:    reviewer2@university.edu.vn       │")
        print("└─────────────────────────────────────────────────┘")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
