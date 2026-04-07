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
        INSERT INTO projects (title, budget, start_date, description, leader_id) 
        VALUES (%s, %s, %s, %s, %s)
    """, (data['title'], data.get('budget', 0), data['start_date'], data.get('description', ''), user_id))
    
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
