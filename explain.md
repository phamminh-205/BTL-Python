# Giải Thích Mã Nguồn

Hệ thống Quản lý NCKH được xây dựng dựa trên kiến trúc **Client-Server** đơn giản, hiệu quả và dễ bảo trì. Dưới đây là giải thích chi tiết về cách các thành phần hoạt động.

---

## 1. Cơ Sở Dữ Liệu (Database Schema)

Chúng ta sử dụng **PostgreSQL** với 3 bảng chính:

- **`users`**: Lưu trữ thông tin người dùng. Đặc biệt có cột `role` kiểu Enum (`ADMIN`, `TEACHER`, `STUDENT`) để phân quyền.
- **`projects`**: Lưu trữ thông tin đề tài.
    - `leader_id`: Liên kết đến bảng `users` để xác định giảng viên chủ trì.
    - `status`: Trạng thái đề tài (`DRAFT`, `APPROVED`, v.v.).
    - `lab_location` & `document_url`: Các thông tin bổ sung phục vụ thực tế.
- **`project_members`**: Bảng trung gian thể hiện mối quan hệ nhiều-nhiều giữa Sinh viên và Đề tài.
    - `student_notes`: Lưu trữ hồ sơ năng lực (GPA, giới thiệu) khi sinh viên đăng ký.

---

## 2. Backend (Flask API)

Backend được tổ chức theo cấu trúc **Blueprint** để tách biệt logic:

### `main.py` (Trái tim của ứng dụng)
- Khởi tạo Flask App và cấu hình CORS.
- **Auto-migration**: Hàm `init_db_schema()` sẽ tự động chạy lệnh `ALTER TABLE` để thêm các cột mới nếu bạn cập nhật mã nguồn mà không muốn xóa database cũ. Điều này cực kỳ hữu ích trong quá trình phát triển.

### `db.py`
- Quản lý kết nối đến PostgreSQL thông qua `psycopg2`. Sử dụng biến môi trường `DATABASE_URL` để linh hoạt giữa môi trường Docker và môi trường cục bộ.

### `projects.py` & `requests_data.py`
- Thực hiện các nghiệp vụ CRUD (Create, Read, Update, Delete).
- Sử dụng `RealDictCursor` của psycopg2 để trả về dữ liệu dưới dạng Dictionary (JSON), giúp Frontend dễ dàng xử lý.
- Kiểm tra Header (`X-User-Role`, `X-User-Id`) trong mọi yêu cầu để đảm bảo tính bảo mật và đúng quyền hạn.

---

## 3. Frontend (Modern Vanilla UI)

Frontend không sử dụng Framework phức tạp mà tập trung vào sự tối giản và hiệu suất:

### Hệ thống thiết kế (Design System - `style.css`)
- Sử dụng **CSS Variables**: Giúp dễ dàng thay đổi tông màu chủ đạo trên toàn hệ thống.
- **Layout Flexbox/Grid**: Đảm bảo giao diện Dashboard luôn cân đối và hiện đại.
- **Micro-animations**: Các hiệu ứng hover, shadow và transitions được chăm chút để tạo cảm giác "Premium".

### Logic xử lý (`app.js`)
- **State Management**: Sử dụng các biến toàn cục như `currentProjects`, `myRequests` để lưu trữ dữ liệu tạm thời, giúp UI phản ứng nhanh mà không cần load lại trang.
- **Fetch API wrapper**: Hàm `fetchAPI()` tự động đính kèm ID và Role của người dùng vào Header của mọi yêu cầu, giúp đồng bộ hóa xác thực.
- **Role-based UI**: Hàm `checkAuthAndLoadData()` sẽ quyết định thẻ Panel nào (`adminPanel`, `teacherPanel`, `studentPanel`) được hiển thị dựa trên vai trò của người dùng sau khi đăng nhập.

---

## 4. Cơ chế Đăng ký Đề tài (Application Flow)

1.  **Sinh viên**: Nhấn nút "Xin tham gia" -> Hiện **Modal**.
2.  **Modal**: Thu thập thông tin giới thiệu bản thân.
3.  **Gửi yêu cầu**: API `POST /api/requests` được gọi kèm theo `notes`.
4.  **Giảng viên**: Nhấn "Yêu cầu SV" -> Backend trả về danh sách kèm theo `student_notes`.
5.  **Duyệt**: Giảng viên nhấn "Chấp nhận" -> Cột `status` trong `project_members` chuyển từ `PENDING` sang `APPROVED`.

---

## 5. Dockerization

Dự án sử dụng **Docker Compose** với 3 Service:
- `db`: Database PostgreSQL.
- `backend`: Chạy Python Flask.
- `frontend`: Sử dụng Nginx để hiển thị giao diện.
- **Networks**: Sử dụng mạng bridge riêng để các service có thể giao tiếp với nhau bằng tên
