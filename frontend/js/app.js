// ===== CONFIG =====
const API_URL = "http://localhost:8000/api";

// Biến lưu tạm danh sách đề tài để dùng cho việc Edit
let currentProjects = [];

// ===== XỬ LÝ LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const errMsg = document.getElementById('errorMsg');
        
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('user_id', data.user.id);
                localStorage.setItem('user_role', data.user.role);
                localStorage.setItem('username', data.user.username);
                window.location.href = 'dashboard.html';
            } else {
                errMsg.innerText = data.message;
                errMsg.style.display = 'block';
            }
        } catch (err) {
            errMsg.innerText = "Lỗi kết nối tới máy chủ!";
            errMsg.style.display = 'block';
        }
    });
}

// ===== KIỂM TRA ĐĂNG NHẬP =====
function checkAuthAndLoadData() {
    const userId = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('username');
    
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userNameLabel').innerText = name;
    document.getElementById('userRoleBadge').innerText = role;

    if (role === 'ADMIN') document.getElementById('adminPanel').style.display = 'block';
    if (role === 'TEACHER') document.getElementById('teacherPanel').style.display = 'block';

    loadProjects();
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

async function fetchAPI(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['X-User-Id'] = localStorage.getItem('user_id');
    options.headers['X-User-Role'] = localStorage.getItem('user_role');
    options.headers['Content-Type'] = 'application/json';
    
    const res = await fetch(`${API_URL}${endpoint}`, options);
    return res.json();
}

// ===== API GỌI DATA ĐỀ TÀI =====
async function loadProjects() {
    const projects = await fetchAPI('/projects');
    currentProjects = projects; // Lưu lại để dùng khi Edit
    const tbody = document.getElementById('projectsBody');
    const role = localStorage.getItem('user_role');
    const currentUserId = localStorage.getItem('user_id');
    tbody.innerHTML = '';
    
    projects.forEach(p => {
        let actionButtons = '';
        
        // Hiển thị Lab và Document Link nếu có
        let metaInfo = `<br><small style="color:#666">📍 Lab: ${p.lab_location || 'Chưa cập nhật'}</small>`;
        if (p.document_url) {
            metaInfo += ` | <a href="${p.document_url}" target="_blank" style="font-size:11px; text-decoration:none; color:#0056b3;">🔗 Tài liệu</a>`;
        }

        // ADMIN: Duyệt / Hủy
        if (role === 'ADMIN') {
            if (p.status !== 'APPROVED') actionButtons += `<button class="btn btn-success btn-sm" onclick="changeStatus('${p.id}', 'APPROVED')">Duyệt</button> `;
            if (p.status !== 'REJECTED') actionButtons += `<button class="btn btn-sm" style="background:red; color:white;" onclick="changeStatus('${p.id}', 'REJECTED')">Hủy</button>`;
        }
        
        // TEACHER: Xem yêu cầu & Sửa đề tài của mình
        if (role === 'TEACHER') {
            actionButtons += `<button class="btn btn-primary btn-sm" onclick="viewRequests('${p.id}')">Yêu cầu SV</button> `;
            if (p.leader_id === currentUserId) {
                actionButtons += `<button class="btn btn-sm" style="background:#6c757d; color:white;" onclick="openEditProject('${p.id}')">Chỉnh sửa</button>`;
            }
        }
        
        // STUDENT: Xin tham gia
        if (role === 'STUDENT') {
            actionButtons += `<button class="btn btn-success btn-sm" onclick="applyProject('${p.id}')">Xin tham gia</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>
                    <b>${p.title}</b>
                    ${metaInfo}
                    <p style="font-size:12px; margin:5px 0 0 0; color:#444;">${p.description || ''}</p>
                </td>
                <td>${p.leader_name}</td>
                <td>${p.start_date || 'N/A'}</td>
                <td><span class="badge" style="background:#f1f1f1; border:1px solid #ddd">${p.status}</span></td>
                <td>${actionButtons}</td>
            </tr>
        `;
    });
}

// Giảng viên chỉnh sửa
function openEditProject(id) {
    const p = currentProjects.find(item => item.id === id);
    if (!p) return;
    
    document.getElementById('editProjectId').value = p.id;
    document.getElementById('editTitle').value = p.title;
    document.getElementById('editDescription').value = p.description || '';
    document.getElementById('editLab').value = p.lab_location || '';
    document.getElementById('editDoc').value = p.document_url || '';
    document.getElementById('editFormTitle').innerText = "Cập nhật đề tài: " + p.title;
    
    document.getElementById('editProjectForm').style.display = 'block';
    window.scrollTo(0, 0);
}

async function updateProjectAction() {
    const id = document.getElementById('editProjectId').value;
    const body = {
        title: document.getElementById('editTitle').value,
        description: document.getElementById('editDescription').value,
        lab_location: document.getElementById('editLab').value,
        document_url: document.getElementById('editDoc').value
    };
    
    const res = await fetchAPI(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    if(res.success) {
        alert("Cập nhật thành công!");
        document.getElementById('editProjectForm').style.display = 'none';
        loadProjects();
    } else {
        alert("Lỗi: " + (res.error || "Không thể cập nhật"));
    }
}

// Admin: Duyệt đề tài
async function changeStatus(projectId, newStatus) {
    if(!confirm("Xác nhận đổi trạng thái?")) return;
    await fetchAPI(`/projects/${projectId}/status`, { method: 'PUT', body: JSON.stringify({status: newStatus}) });
    loadProjects();
}

// Giảng viên tạo đề tài
async function createProject() {
    const body = {
        title: document.getElementById('newTitle').value,
        start_date: document.getElementById('newDate').value,
        lab_location: document.getElementById('newLab').value,
        description: document.getElementById('newDescription').value
    };
    if(!body.title || !body.start_date) return alert("Vui lòng nhập Tên và Ngày bắt đầu!");
    
    await fetchAPI('/projects', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('addProjectForm').style.display='none';
    loadProjects();
}

// Sinh viên xin tham gia
async function applyProject(projectId) {
    const out = await fetchAPI('/requests', { method: 'POST', body: JSON.stringify({project_id: projectId}) });
    if(out.success) alert("Đã gửi yêu cầu tham gia!");
    else alert(out.message || "Lỗi gửi yêu cầu");
}

// Giảng viên duyệt sinh viên
async function viewRequests(projectId) {
    const reqs = await fetchAPI(`/requests/project/${projectId}`);
    const panel = document.getElementById('requestsPanel');
    const content = document.getElementById('requestsBody');
    panel.style.display = 'block';
    
    content.innerHTML = reqs.length ? '<ul style="list-style:none; padding:0;">' + reqs.map(r => `
        <li style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div><b>${r.username}</b> (${r.email}) - <small>${r.status}</small></div>
            ${r.status === 'PENDING' ? `
                <div>
                    <button class="btn btn-success btn-sm" onclick="changeRequestStatus('${r.project_id}','${r.user_id}','APPROVED')">Duyệt</button>
                    <button class="btn btn-sm" style="background:red;color:white" onclick="changeRequestStatus('${r.project_id}','${r.user_id}','REJECTED')">Từ chối</button>
                </div>
            ` : ''}
        </li>
    `).join('') + '</ul>' : "Chưa có sinh viên nào đăng ký tham gia đề tài này.";
}

async function changeRequestStatus(pId, uId, status) {
    await fetchAPI(`/requests/${pId}/${uId}/status`, { method: 'PUT', body: JSON.stringify({status: status}) });
    viewRequests(pId);
}

// --- ADMIN: QUẢN LÝ TÀI KHOẢN ---
async function createUser() {
    const body = {
        username: document.getElementById('adminNewUser').value,
        password: document.getElementById('adminNewPass').value,
        role: document.getElementById('adminNewRole').value,
        email: document.getElementById('adminNewEmail').value
    };
    if(!body.username || !body.password || !body.email) return alert("Vui lòng nhập đầy đủ thông tin tài khoản!");
    
    const res = await fetchAPI('/users', { method: 'POST', body: JSON.stringify(body) });
    if(res.success) {
        alert("Tạo tài khoản thành công!");
        fetchUsers();
    } else {
        alert("Lỗi khi tạo tài khoản!");
    }
}

async function fetchUsers() {
    const users = await fetchAPI('/users');
    let html = `
        <table class="table" style="font-size:13px; margin-top:10px;">
            <thead style="background:#eee"><tr><th>Username</th><th>Vai trò</th><th>Email</th><th></th></tr></thead>
            <tbody>
    `;
    users.forEach(u => {
        html += `<tr>
            <td><b>${u.username}</b></td><td>${u.role}</td><td>${u.email}</td>
            <td style="text-align:right"><button class="btn btn-sm" style="background:#dc3545; color:white" onclick="deleteUser('${u.id}')">Xóa</button></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('usersListContent').innerHTML = html;
}

async function deleteUser(id) {
    if(confirm("Xác nhận xóa tài khoản này?")) {
        await fetchAPI(`/users/${id}`, {method: 'DELETE'});
        fetchUsers();
    }
}
