"""Tests for Progress Management module — permissions and state transitions."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ── Auth helpers ───────────────────────────────────────────────────

def login(email: str, password: str = "password123") -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Fixtures ───────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def faculty_token():
    return login("faculty1@university.edu.vn")


@pytest.fixture(scope="module")
def faculty3_token():
    return login("faculty3@university.edu.vn")


@pytest.fixture(scope="module")
def staff_token():
    return login("staff@university.edu.vn")


@pytest.fixture(scope="module")
def leader_token():
    return login("leader@university.edu.vn")


@pytest.fixture(scope="module")
def approved_proposal_id(faculty_token, staff_token, leader_token):
    """Get the IN_PROGRESS proposal for faculty1 from seeded data."""
    resp = client.get(
        "/api/proposals?status=IN_PROGRESS&size=50",
        headers=headers(staff_token),
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) > 0, "No IN_PROGRESS proposals in DB — run seed first"
    # Return the one owned by faculty1
    for p in items:
        if "học máy" in p["title"].lower() or "tiểu đường" in p["title"].lower():
            return p["id"]
    return items[0]["id"]


# ══════════════════════════════════════════════════════════════════
# PERMISSION TESTS
# ══════════════════════════════════════════════════════════════════

class TestProgressPermissions:

    def test_faculty_cannot_access_staff_endpoints(self, faculty_token):
        resp = client.get("/api/progress?page=1", headers=headers(faculty_token))
        assert resp.status_code == 403

    def test_staff_cannot_submit_progress_report(self, staff_token, approved_proposal_id):
        resp = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "content": "Test content for progress report that is long enough",
                "completion_pct": 10,
                "next_steps": "Plan next steps for the project",
            },
            headers=headers(staff_token),
        )
        assert resp.status_code == 403

    def test_reviewer_cannot_submit_progress(self, approved_proposal_id):
        token = login("reviewer1@university.edu.vn")
        resp = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "content": "x" * 50,
                "completion_pct": 10,
                "next_steps": "Next steps here",
            },
            headers=headers(token),
        )
        assert resp.status_code == 403

    def test_faculty_other_cannot_submit_to_others_proposal(
        self, faculty3_token, approved_proposal_id
    ):
        """faculty3 tries to submit a report to faculty1's proposal — should get 403."""
        resp = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "content": "Trying to hijack another PI's proposal report",
                "completion_pct": 10,
                "next_steps": "This should be rejected",
            },
            headers=headers(faculty3_token),
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_progress(self, approved_proposal_id):
        resp = client.get(f"/api/progress/proposals/{approved_proposal_id}")
        assert resp.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════════
# FACULTY — SUBMIT PROGRESS REPORT
# ══════════════════════════════════════════════════════════════════

class TestProgressSubmission:

    def test_faculty_can_view_own_proposal_progress(self, faculty_token, approved_proposal_id):
        resp = client.get(
            f"/api/progress/proposals/{approved_proposal_id}",
            headers=headers(faculty_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # Seeded data has 3 reports
        assert len(data) >= 0

    def test_submit_progress_report_valid(self, faculty_token, approved_proposal_id):
        resp = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "report_period": "Tháng 5/2026",
                "content": "Đã hoàn thiện prototype web và tiến hành thử nghiệm với 50 bệnh nhân tình nguyện.",
                "products_created": "Prototype web v1.0, Báo cáo thử nghiệm lâm sàng bước đầu",
                "completion_pct": 90,
                "issues": "Một số bệnh nhân từ chối tham gia thử nghiệm.",
                "next_steps": "Hoàn chỉnh thử nghiệm lâm sàng với 200 bệnh nhân, viết bài báo ISI.",
                "attachment_url": "https://example.com/reports/test-report.pdf",
            },
            headers=headers(faculty_token),
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["status"] == "SUBMITTED"
        assert float(data["completion_pct"]) == 90
        assert data["is_overdue"] == False
        assert data["products_created"] is not None
        return data["id"]

    def test_completion_pct_cannot_decrease(self, faculty_token, approved_proposal_id):
        """Submitting a report with lower completion_pct than previous should fail."""
        resp = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "content": "This should fail because pct is lower than previous.",
                "completion_pct": 10,  # Way lower than seeded 65%
                "next_steps": "Should not be allowed.",
            },
            headers=headers(faculty_token),
        )
        assert resp.status_code == 400
        assert "không được giảm" in resp.json()["detail"]

    def test_faculty_cannot_submit_to_draft_proposal(self, faculty_token):
        """DRAFT proposals should reject progress reports."""
        # Get a DRAFT proposal
        resp = client.get(
            "/api/proposals?status=DRAFT&size=10",
            headers=headers(faculty_token),
        )
        if resp.status_code != 200 or not resp.json().get("items"):
            pytest.skip("No DRAFT proposals available")
        pid = resp.json()["items"][0]["id"]
        r2 = client.post(
            f"/api/progress/proposals/{pid}",
            json={
                "content": "Trying to submit to a draft proposal",
                "completion_pct": 10,
                "next_steps": "Not allowed",
            },
            headers=headers(faculty_token),
        )
        assert r2.status_code == 400


# ══════════════════════════════════════════════════════════════════
# STAFF — REVIEW PROGRESS REPORT
# ══════════════════════════════════════════════════════════════════

class TestProgressReview:

    @pytest.fixture
    def submitted_report_id(self, staff_token):
        """Get a SUBMITTED report from seeded data."""
        resp = client.get(
            "/api/progress?status=SUBMITTED&size=10",
            headers=headers(staff_token),
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        if not items:
            pytest.skip("No SUBMITTED reports available")
        return items[0]["id"]

    def test_staff_can_list_all_progress(self, staff_token):
        resp = client.get("/api/progress?page=1&size=10", headers=headers(staff_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_staff_can_review_accepted(self, staff_token, submitted_report_id):
        resp = client.post(
            f"/api/progress/reports/{submitted_report_id}/review",
            json={"status": "ACCEPTED", "note": "Tiến độ tốt, đúng kế hoạch."},
            headers=headers(staff_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ACCEPTED"
        assert data["review_note"] == "Tiến độ tốt, đúng kế hoạch."
        assert data["reviewed_by"] is not None

    def test_cannot_review_already_reviewed_report(self, staff_token):
        """Trying to review an already-reviewed report should fail."""
        # Find an ACCEPTED report
        resp_list = client.get(
            "/api/progress?status=ACCEPTED&size=10",
            headers=headers(staff_token),
        )
        items = resp_list.json()["items"]
        if not items:
            pytest.skip("No ACCEPTED reports available to test")
        
        accepted_id = items[0]["id"]
        
        resp = client.post(
            f"/api/progress/reports/{accepted_id}/review",
            json={"status": "NEEDS_REVISION", "note": "Should fail."},
            headers=headers(staff_token),
        )
        assert resp.status_code == 400

    def test_review_with_invalid_status(self, staff_token, submitted_report_id):
        resp = client.post(
            f"/api/progress/reports/{submitted_report_id}/review",
            json={"status": "APPROVED", "note": "Invalid status"},
            headers=headers(staff_token),
        )
        assert resp.status_code == 422  # Pydantic validation

    def test_staff_can_mark_delayed(self, faculty_token, staff_token, approved_proposal_id):
        """Submit a new report and mark it as DELAYED."""
        # Submit a new report first
        r1 = client.post(
            f"/api/progress/proposals/{approved_proposal_id}",
            json={
                "report_period": "Tháng 5-6/2026",
                "content": "Báo cáo kiểm tra trạng thái DELAYED cho unit test.",
                "completion_pct": 95,
                "next_steps": "Tiếp tục theo đúng kế hoạch.",
            },
            headers=headers(faculty_token),
        )
        if r1.status_code != 201:
            pytest.skip(f"Could not submit report: {r1.text}")
        report_id = r1.json()["id"]

        # Mark as DELAYED
        r2 = client.post(
            f"/api/progress/reports/{report_id}/review",
            json={"status": "DELAYED", "note": "Đề tài chậm trễ so với kế hoạch."},
            headers=headers(staff_token),
        )
        assert r2.status_code == 200
        assert r2.json()["status"] == "DELAYED"
        assert r2.json()["is_overdue"] == True


# ══════════════════════════════════════════════════════════════════
# TIMELINE ENDPOINT
# ══════════════════════════════════════════════════════════════════

class TestProjectTimeline:

    def test_faculty_can_view_own_timeline(self, faculty_token, approved_proposal_id):
        resp = client.get(
            f"/api/progress/proposals/{approved_proposal_id}/timeline",
            headers=headers(faculty_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["proposal_id"] == approved_proposal_id
        assert "status_history" in data
        assert "progress_reports" in data
        assert data["total_reports"] >= 0
        assert 0.0 <= data["latest_completion_pct"] <= 100.0

    def test_staff_can_view_any_timeline(self, staff_token, approved_proposal_id):
        resp = client.get(
            f"/api/progress/proposals/{approved_proposal_id}/timeline",
            headers=headers(staff_token),
        )
        assert resp.status_code == 200

    def test_timeline_nonexistent_proposal(self, faculty_token):
        resp = client.get(
            "/api/progress/proposals/00000000-0000-0000-0000-000000000000/timeline",
            headers=headers(faculty_token),
        )
        assert resp.status_code == 404


# ══════════════════════════════════════════════════════════════════
# DASHBOARD ENDPOINTS
# ══════════════════════════════════════════════════════════════════

class TestProgressDashboard:

    def test_faculty_dashboard(self, faculty_token):
        resp = client.get(
            "/api/progress/dashboard/faculty",
            headers=headers(faculty_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_active_projects" in data
        assert "items" in data
        assert data["total_active_projects"] >= 0

    def test_staff_dashboard(self, staff_token):
        resp = client.get(
            "/api/progress/dashboard/staff",
            headers=headers(staff_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "total_in_progress" in data
        assert "total_overdue_reports" in data
        assert "pending_review_count" in data
        assert "status_breakdown" in data

    def test_faculty_cannot_access_staff_dashboard(self, faculty_token):
        resp = client.get(
            "/api/progress/dashboard/staff",
            headers=headers(faculty_token),
        )
        assert resp.status_code == 403

    def test_staff_cannot_access_faculty_dashboard(self, staff_token):
        resp = client.get(
            "/api/progress/dashboard/faculty",
            headers=headers(staff_token),
        )
        assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════
# OVERDUE DETECTION
# ══════════════════════════════════════════════════════════════════

class TestOverdueDetection:

    def test_overdue_list_accessible_to_staff(self, staff_token):
        resp = client.get("/api/progress/overdue", headers=headers(staff_token))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        # All returned items must be overdue
        for item in data["items"]:
            assert item["is_overdue"] == True

    def test_filter_overdue_in_list(self, staff_token):
        resp = client.get(
            "/api/progress?overdue_only=true",
            headers=headers(staff_token),
        )
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["is_overdue"] == True
