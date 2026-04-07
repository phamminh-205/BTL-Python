from flask import Blueprint, request, jsonify
from psycopg2.extras import RealDictCursor
from db import get_db_connection

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, username, role, email FROM users WHERE username = %s AND password = %s", (username, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            "success": True, 
            "user": {
                "id": str(user['id']),
                "username": user['username'],
                "role": user['role']
            }
        })
    else:
        return jsonify({"success": False, "message": "Sai tài khoản hoặc mật khẩu"}), 401
