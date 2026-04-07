# Hệ Thống Quản Lý Đề Tài Nghiên cứu Khoa học (NCKH)

Dự án là nền tảng quản lý đề tài NCKH dành cho khoa, hỗ trợ đầy đủ các tính năng thực tế như quản lý vị trí nghiên cứu, tài liệu khoa học và phân quyền người dùng.

## Công Nghệ & Kiến Trúc

- **Backend**: Python 3.10+, **Flask**, **psycopg2**.
- **Cơ Sở Dữ Liệu**: **PostgreSQL** 15.
- **Frontend**: **Vanilla HTML/CSS/JS**.
- **Containerization**: Toàn bộ hệ thống chạy trên **Docker**.

---

## Các Tính Năng

### Quản Trị Viên (Admin)
- **Thống kê & Kiểm soát**: Xem trạng thái của tất cả các đề tài trên toàn hệ thống.
- **Duyệt/Hủy Đề tài**: Thêm tính năng phê duyệt chính thức cho các đề tài mới đăng ký.
- **Quản lý Tài khoản**: Tạo mới, xóa hoặc cập nhật thông tin cho Giảng viên và Sinh viên ngay trên giao diện web.

### Giảng Viên (Teacher)
- **Đăng ký Đề tài**: Khai báo tên đề tài, ngân sách, ngày bắt đầu, mô tả chi tiết và địa điểm phòng Lab.
- **Cập nhật Tiến độ**: Sửa đổi thông tin đề tài bất cứ lúc nào, đính kèm Link tài liệu (Drive/OneDrive) để sinh viên tiếp cận.
- **Phê duyệt Thành viên**: Xem danh sách sinh viên xin tham gia và duyệt/từ chối trực tiếp.

### Sinh Viên (Student)
- **Tra cứu Đề tài**: Xem danh sách các đề tài đã được duyệt, xem thông tin phòng Lab và tài liệu đính kèm.
- **Đăng ký Tham gia**: Gửi yêu cầu tham gia vào các nhóm nghiên cứu của Giảng viên.

---

## Hướng Dẫn Khởi Chạy

Bạn cần cài đặt **Docker Desktop** để chạy dự án.

1.  **Clone mã nguồn** và mở terminal tại thư mục gốc.
2.  **Khởi chạy hệ thống**:
    ```bash
    docker compose up --build -d
    ```
3.  **Truy cập ứng dụng**: [http://localhost](http://localhost)

---

## Thông Tin Đăng Nhập Mẫu

| Vai trò | Tài khoản | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị viên** | `admin` | `admin123` |
| **Giảng viên** | `teacher1` | `123456` |
| **Sinh viên** | `student1` | `123456` |

