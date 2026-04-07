from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from db import get_db_connection

users_bp = Blueprint('users', __name__)

@users_bp.route("/api/users", methods=["GET"])
def get_users():
    user_role = request.headers.get("X-User-Role")
    if user_role != 'ADMIN':
        return jsonify({"error": "Denied"}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, username, role, email FROM users")
    users = cursor.fetchall()
    conn.close()
    
    for u in users:
        u['id'] = str(u['id'])
    return jsonify(users)

@users_bp.route("/api/users", methods=["POST"])
def add_user():
    user_role = request.headers.get("X-User-Role")
    if user_role != 'ADMIN':
        return jsonify({"error": "Denied"}), 403
        
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (username, password, role, email) VALUES (%s, %s, %s, %s)", 
                   (data['username'], data['password'], data['role'], data['email']))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@users_bp.route("/api/users/<target_user_id>", methods=["DELETE"])
def delete_user(target_user_id):
    user_role = request.headers.get("X-User-Role")
    if user_role != 'ADMIN':
        return jsonify({"error": "Denied"}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (target_user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})
