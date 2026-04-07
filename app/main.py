from flask import Flask, jsonify
from flask_cors import CORS
from auth import auth_bp
from projects import projects_bp
from requests_data import requests_bp
from users import users_bp

app = Flask(__name__)
# Bật CORS vô điều kiện để đơn giản hóa cho người mới
CORS(app)

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
