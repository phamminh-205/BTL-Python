# Khoa An toàn Thông tin - Hệ thống Quản lý NCKH

Dự án là một nền tảng dành cho việc quản lý các đề tài Nghiên cứu Khoa học (NCKH) trong môi trường giáo dục. Hệ thống được thiết kế với giao diện chuyên nghiệp, hỗ trợ phân quyền chặt chẽ giữa Quản trị viên, Giảng viên và Sinh viên.

---

## Tổng quan

- **Giao diện Modern UI/UX**: Sử dụng hệ thống thiết kế hiện đại với font chữ **Inter**, bộ icon chuyên nghiệp từ **Phosphor Icons**, mang lại cảm giác của một ứng dụng thực thụ.
- **Tính năng Đăng ký Hồ sơ**: Sinh viên có thể gửi kèm lời giới thiệu năng lực (GPA, kinh nghiệm) khi đăng ký tham gia đề tài.
- **Phân quyền dựa trên Role**: 
    - **Admin**: Quản lý toàn bộ hệ thống, tài khoản và phê duyệt đề tài.
    - **Giảng viên**: Chủ trì đề tài, quản lý thành viên và cập nhật tài liệu nghiên cứu.
    - **Sinh viên**: Tìm kiếm đề tài và theo dõi trạng thái tham gia.
- **Kiến trúc bền vững**: Tự động đồng bộ hóa cấu trúc CSDL (Auto-migration) khi khởi động.
- **Sẵn sàng triển khai**: Đóng gói toàn bộ qua **Docker**, chỉ cần một lệnh duy nhất để chạy.

---

## Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Backend** | Python (Flask), Psycopg2 |
| **Database** | PostgreSQL |
| **Frontend** | HTML5, Vanilla CSS3, Javascript |
| **Deploy** | Docker, Docker Compose |

---

## Hướng Dẫn Cài Đặt & Chạy

Hệ thống yêu cầu máy tính đã cài đặt **Docker** và **Docker Compose**.

### 1. Khởi chạy hệ thống
Mở Terminal/PowerShell tại thư mục gốc của dự án và chạy:
```bash
docker compose up --build -d
```

### 2. Truy cập ứng dụng
Sau khi các container khởi động thành công, truy cập vào địa chỉ:
[**http://localhost**](http://localhost)

### 3. Thông tin đăng nhập thử nghiệm

| Vai trò | Tài khoản | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị viên** | `admin` | `admin123` |
| **Giảng viên** | `teacher1` | `123456` |
| **Sinh viên** | `student1` | `123456` |

---
