# Hệ Thống Quản Lý Đề Tài NCKH và Hoạt Động Khoa Học
**Dự án Bài Tập Lớn (BTL) - Khoa An toàn Thông tin**

Dự án là một hệ thống Website Full-Stack quản trị vòng đời đề tài nghiên cứu khoa học, gán quyền truy cập Role-Based Access Control (RBAC) nghiêm ngặt và kiến trúc chịu tải với Docker.

## Công Nghệ Sử Dụng

- **Backend Logic**: Pytgon 3.10+, FastAPI, Pydantic, Passlib (Bcrypt hashing)
- **Cơ Sở Dữ Liệu**: Tiêu chuẩn RDBMS PostgreSQL (thông qua `asyncpg` chặn Error native), SQLAlchemy (Async ORM).
- **Frontend Panel**: React 18, Vite, Axios Interceptors (JWT Token Auth), Vanilla CSS, Lucide-Icons.
- **Microservices Deployment**: Docker, Docker Compose (Tự động khởi tạo mạng cô lập).

---

## Phân Quyền Hệ Thống (RBAC Layers)

Hệ thống cung cấp trải nghiệm UI và API giới hạn theo Role quy chuẩn:

| Quyền Hạn | ADMIN (Quản Trị) | TEACHER (Giảng Viên) | STUDENT (Sinh Viên) |
| :--- | :--- | :--- | :--- |
| **Xem bảng Đề Tài** | Đầy đủ | Đầy đủ | Chỉ Đọc (Read-Only) |
| **Đăng ký mới** | Bật | Bật | Bị Tước API / Ẩn Nút |
| **Quản trị Nhân sự** | Mọi Dự án | Chỉ Dự án sở hữu (`leader_id`) | Bị Cấm Truy cập |
| **Khai báo Bài Báo** | Mọi Dự án | Chỉ Dự án sở hữu (`leader_id`) | Bị Cấm Truy cập |
| **Xóa Mềm (Delete)** | **ON** | OFF | OFF |

---

## Hướng Dẫn Cài Đặt Khởi Chạy

Toàn bộ hệ thống chạy chia tách Backend (trong Container) và Frontend (Dev Local) vô cùng linh hoạt. 

### Khởi động Frontend + Backend + DB bằng Docker
Di chuyển Terminal vào thư mục chứa `docker-compose.yml` (Thư mục gốc) và chạy:
```bash
docker compose up -d --build
```
> **Lưu ý**: Lệnh này tự động tải Image Postgres+Python, lập tức kết nối và nạp Seed Data. Sau ~20 giây, Backend sẽ đứng đợi tại địa chỉ `http://localhost:8000`. API Docs có tại `http://localhost:8000/docs`.

---

## Mẫu Tài Khoản (Seed Data)
Cơ sở dữ liệu tự nạp sẵn cho Giám khảo 3 Tài khoản kiểm thử thuộc 3 Tầng Quyền:

1. **`admin`** | Mật khẩu: `admin123` *(Full quyền, Quyền chém dự án)*
2. **`teacher1`** | Mật khẩu: `admin123` *(Lãnh chúa vùng không gian riêng: Menu Cập nhật đề tài cá nhân)*
3. **`student1`** | Mật khẩu: `admin123` *(Menu bị giấu bớt, Trải nghiệm tham quan 100% Thuần túy View-Only)*

---
