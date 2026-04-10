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
    // document.getElementById('userRoleBadge').innerText = role; // Đã gỡ bỏ badge khỏi HTML

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
    currentProjects = projects; 
    const tbody = document.getElementById('projectsBody');
    const role = localStorage.getItem('user_role');
    const currentUserId = localStorage.getItem('user_id');
    tbody.innerHTML = '';
    
    projects.forEach(p => {
        let actionButtons = '';
        
        let metaInfo = `<div style="margin-top:8px; display:flex; gap:12px; font-size:12px;">
            <span style="color:var(--text-muted); display:flex; align-items:center; gap:4px;"><i class="ph ph-map-pin"></i> ${p.lab_location || 'Chưa cập nhật'}</span>`;
        if (p.document_url) {
            metaInfo += `<a href="${p.document_url}" target="_blank" style="text-decoration:none; color:var(--primary); display:flex; align-items:center; gap:4px; font-weight:600;"><i class="ph ph-link"></i> Tài liệu</a>`;
        }
        metaInfo += `</div>`;

        if (role === 'ADMIN') {
            if (p.status !== 'APPROVED') actionButtons += `<button class="btn btn-success btn-sm" onclick="changeStatus('${p.id}', 'APPROVED')"><i class="ph ph-check"></i> Duyệt</button> `;
            if (p.status !== 'REJECTED') actionButtons += `<button class="btn btn-danger btn-sm" onclick="changeStatus('${p.id}', 'REJECTED')"><i class="ph ph-x"></i> Hủy</button>`;
        }
        
        if (role === 'TEACHER') {
            actionButtons += `<button class="btn btn-primary btn-sm" onclick="viewRequests('${p.id}')"><i class="ph ph-users"></i> Yêu cầu SV</button> `;
            if (p.leader_id === currentUserId) {
                actionButtons += `<button class="btn btn-secondary btn-sm" onclick="openEditProject('${p.id}')"><i class="ph ph-pencil"></i> Sửa</button>`;
            }
        }
        
        if (role === 'STUDENT') {
            actionButtons += `<button class="btn btn-success btn-sm" onclick="applyProject('${p.id}')"><i class="ph ph-paper-plane-tilt"></i> Xin tham gia</button>`;
        }

        const statusStyle = p.status === 'APPROVED' ? 'background:#dcfce7; color:#166534;' : 
                            p.status === 'REJECTED' ? 'background:#fee2e2; color:#991b1b;' : 
                            'background:#f1f5f9; color:#475569;';

        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:700; font-size:15px; color:var(--text-main);">${p.title}</div>
                    <div style="font-size:13px; color:var(--text-muted); margin-top:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${p.description || 'Không có mô tả.'}</div>
                    ${metaInfo}
                </td>
                <td style="font-weight:500;"><i class="ph ph-user-circle"></i> ${p.leader_name}</td>
                <td style="color:var(--text-muted); font-size:13px;">${p.start_date || 'N/A'}</td>
                <td><span class="badge" style="${statusStyle}">${p.status}</span></td>
                <td style="text-align:right;"><div style="display:flex; justify-content:flex-end; gap:6px;">${actionButtons}</div></td>
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
    
    content.innerHTML = reqs.length ? '<div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">' + reqs.map(r => `
        <div style="background:white; padding:15px; border-radius:10px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-weight:600; color:var(--text-main);">${r.username}</div>
                <div style="font-size:12px; color:var(--text-muted);">${r.email}</div>
                <div style="margin-top:4px;"><span class="badge" style="font-size:9px; background:#f1f5f9;">${r.status}</span></div>
            </div>
            ${r.status === 'PENDING' ? `
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-success btn-sm" onclick="changeRequestStatus('${r.project_id}','${r.user_id}','APPROVED')"><i class="ph ph-user-plus"></i> Chấp nhận</button>
                    <button class="btn btn-danger btn-sm" onclick="changeRequestStatus('${r.project_id}','${r.user_id}','REJECTED')"><i class="ph ph-user-minus"></i> Từ chối</button>
                </div>
            ` : ''}
        </div>
    `).join('') + '</div>' : "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Chưa có sinh viên nào đăng ký tham gia đề tài này.</div>";
    
    panel.scrollIntoView({ behavior: 'smooth' });
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
