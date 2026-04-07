from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from db import get_db_connection

projects_bp = Blueprint('projects', __name__)

@projects_bp.route("/api/projects", methods=["GET"])
def get_projects():
    user_id = request.headers.get("X-User-Id")
    user_role = request.headers.get("X-User-Role")
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_role == 'ADMIN' or user_role == 'STUDENT':
        cursor.execute("SELECT p.*, u.username as leader_name FROM projects p JOIN users u ON p.leader_id = u.id")
        projects = cursor.fetchall()
    elif user_role == 'TEACHER':
        cursor.execute("SELECT p.*, u.username as leader_name FROM projects p JOIN users u ON p.leader_id = u.id WHERE p.leader_id = %s", (user_id,))
        projects = cursor.fetchall()
    else:
        projects = []
        
    conn.close()
    
    for p in projects:
        p['id'] = str(p['id'])
        p['leader_id'] = str(p['leader_id'])
        if p['start_date']: p['start_date'] = str(p['start_date'])
        if p['created_at']: p['created_at'] = str(p['created_at'])
        
    return jsonify(projects)

@projects_bp.route("/api/projects", methods=["POST"])
def create_project():
    user_id = request.headers.get("X-User-Id")
    user_role = request.headers.get("X-User-Role")
    
    if user_role != 'TEACHER':
        return jsonify({"error": "Chỉ giảng viên mới được tạo đề tài"}), 403
        
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO projects (title, budget, start_date, description, lab_location, leader_id) 
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (data['title'], data.get('budget', 0), data['start_date'], data.get('description', ''), data.get('lab_location', ''), user_id))
    
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@projects_bp.route("/api/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    # Dùng cho Giảng viên cập nhật thông tin đề tài của mình
    user_id = request.headers.get("X-User-Id")
    user_role = request.headers.get("X-User-Role")
    
    if user_role != 'TEACHER':
        return jsonify({"error": "Chỉ giảng viên mới được sửa đề tài"}), 403
        
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Kiểm tra quyền sở hữu đề tài trước khi sửa
    cursor.execute("SELECT leader_id FROM projects WHERE id = %s", (project_id,))
    project = cursor.fetchone()
    
    if not project or str(project[0]) != user_id:
        conn.close()
        return jsonify({"error": "Bạn không có quyền sửa đề tài này"}), 403
        
    cursor.execute("""
        UPDATE projects 
        SET title = %s, description = %s, lab_location = %s, document_url = %s
        WHERE id = %s
    """, (data['title'], data.get('description', ''), data.get('lab_location', ''), data.get('document_url', ''), project_id))
    
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@projects_bp.route("/api/projects/<project_id>/status", methods=["PUT"])
def update_project_status(project_id):
    user_role = request.headers.get("X-User-Role")
    
    if user_role != 'ADMIN':
        return jsonify({"error": "Không có quyền"}), 403
        
    data = request.json
    new_status = data.get("status")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE projects SET status = %s WHERE id = %s", (new_status, project_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})
