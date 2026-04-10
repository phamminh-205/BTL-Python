from flask import Flask, jsonify
from flask_cors import CORS
from auth import auth_bp
from projects import projects_bp
from requests_data import requests_bp
from users import users_bp

app = Flask(__name__)
# Bật CORS vô điều kiện để đơn giản hóa cho người mới
CORS(app)

# Tự động đồng bộ cấu trúc CSDL (Thêm cột nếu thiếu)
def init_db_schema():
    from db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    # Thêm cột lab_location nếu chưa có
    cursor.execute("""
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='lab_location') THEN
                ALTER TABLE projects ADD COLUMN lab_location VARCHAR(255);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='document_url') THEN
                ALTER TABLE projects ADD COLUMN document_url TEXT;
            END IF;
        END $$;
    """)
    conn.commit()
    conn.close()

init_db_schema()

# Đăng ký các Blueprints (phân chia module)
app.register_blueprint(auth_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(requests_bp)
app.register_blueprint(users_bp)


@app.route("/")
def index():
    return jsonify({"message": "API của Hệ thống Quản lý NCKH đang chạy!"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
