from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from db import get_db_connection

requests_bp = Blueprint('requests', __name__)

@requests_bp.route("/api/requests", methods=["POST"])
def apply_project():
    user_id = request.headers.get("X-User-Id")
    user_role = request.headers.get("X-User-Role")
    if user_role != 'STUDENT':
        return jsonify({"error": "Chỉ sinh viên mới gửi yêu cầu"}), 403
        
    project_id = request.json.get("project_id")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO project_members (user_id, project_id, status) VALUES (%s, %s, 'PENDING')", (user_id, project_id))
        conn.commit()
        success = True
    except Exception as e:
        success = False
    finally:
        conn.close()
        
    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Bạn đã gửi yêu cầu rồi"}), 400

@requests_bp.route("/api/requests/project/<project_id>", methods=["GET"])
def get_project_requests(project_id):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT pm.*, u.username, u.email 
        FROM project_members pm JOIN users u ON pm.user_id = u.id 
        WHERE pm.project_id = %s
    """, (project_id,))
    reqs = cursor.fetchall()
    conn.close()
    
    for r in reqs:
        r['user_id'] = str(r['user_id'])
        r['project_id'] = str(r['project_id'])
        if r['joined_at']: r['joined_at'] = str(r['joined_at'])
        
    return jsonify(reqs)

@requests_bp.route("/api/requests/<project_id>/<member_id>/status", methods=["PUT"])
def update_request_status(project_id, member_id):
    user_role = request.headers.get("X-User-Role")
    if user_role != 'TEACHER':
        return jsonify({"error": "Chỉ giảng viên được duyệt"}), 403
        
    status = request.json.get("status")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE project_members SET status = %s WHERE project_id = %s AND user_id = %s", (status, project_id, member_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})
@requests_bp.route("/api/requests/student", methods=["GET"])
def get_student_requests():
    user_id = request.headers.get("X-User-Id")
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        SELECT pm.project_id, pm.status, pm.joined_at, p.title, u.username as leader_name
        FROM project_members pm 
        JOIN projects p ON pm.project_id = p.id 
        JOIN users u ON p.leader_id = u.id
        WHERE pm.user_id = %s
    """, (user_id,))
    reqs = cursor.fetchall()
    conn.close()

    for r in reqs:
        r['project_id'] = str(r['project_id'])
        if r['joined_at']: r['joined_at'] = str(r['joined_at'])
        
    return jsonify(reqs)
