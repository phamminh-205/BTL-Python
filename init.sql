CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE project_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'REJECTED');
CREATE TYPE project_member_role AS ENUM ('CHAIRMAN', 'MEMBER', 'SECRETARY');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    budget DECIMAL(15, 2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    description TEXT,
    lab_location VARCHAR(255),
    document_url TEXT,
    status project_status DEFAULT 'DRAFT',
    leader_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE project_members (
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    role_in_project project_member_role NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, project_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Seed Data --
INSERT INTO users (username, password, role, email, department) VALUES 
('admin', 'admin123', 'ADMIN', 'admin@ptit.edu.vn', 'Ban Quản trị'),
('teacher1', '123456', 'TEACHER', 'teacher1@ptit.edu.vn', 'ATTT'),
('student1', '123456', 'STUDENT', 'student1@ptit.edu.vn', 'D20'),
('student2', '123456', 'STUDENT', 'student2@ptit.edu.vn', 'D20');

-- Insert project
INSERT INTO projects (title, budget, start_date, description, status, leader_id) VALUES 
('Hệ thống kiểm thử tự động', 10000000, '2024-01-01', 'Đề tài về Pentest', 'APPROVED', (SELECT id FROM users WHERE username = 'teacher1')),
('Nghiên cứu Malware', 5000000, '2024-05-01', 'Phân tích mã độc', 'DRAFT', (SELECT id FROM users WHERE username = 'teacher1'));
