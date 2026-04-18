/* SciRes — Main Application Logic */

// ── Router ────────────────────────────────────────────────────────
const pages = {};
function registerPage(id, initFn) { pages[id] = initFn; }

// ── Pagination State ──────────────────────────────────────────────
let _myPropPage = 1;
let _validatePage = 1;
let _periodPage = 1;
let _councilPage = 1;
let _userPage = 1;
let _approvePage = 1;
let _monitorPage = 1;
let _myReviewPage = 1;
const PAGE_SIZE = 10;

function renderPagination(totalItems, currentPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) return '';
  let html = '<div class="pagination" style="display:flex;justify-content:center;gap:8px;margin-top:16px">';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="${onPageChange}(${i})">${i}</button>`;
  }
  html += '</div>';
  return html;
}

function badge(status) {
  const cls = (status || '').toLowerCase().replace(/ /g, '_');
  return `<span class="badge badge-${cls}">${status}</span>`;
}

function fmtDate(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }
function fmtDateShort(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }

function navigate(pageId) {
  // Route Guard: only allow traversing to pages present in the nav (except dashboard)
  const user = API.getUser();
  const navLinks = [...document.querySelectorAll('#nav a')].map(a => a.dataset.page);
  
  if (!navLinks.includes(pageId) && pageId !== 'dashboard') {
    console.warn(`Access denied to ${pageId} for role ${user?.role}`);
    return navigate('dashboard');
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#nav a').forEach(a => a.classList.remove('active'));
  
  const el = document.getElementById(`page-${pageId}`);
  if (el) {
    el.classList.add('active');
    el.removeAttribute('style');
  }
  
  const link = document.querySelector(`#nav a[data-page="${pageId}"]`);
  if (link) link.classList.add('active');
  if (pages[pageId]) pages[pageId]();
}

// Simple notification logic
function showNotification(count) {
  const badge = document.getElementById('notif-count');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('notif-bell')?.addEventListener('click', () => {
    alert('Tính năng thông báo đang được phát triển. Bạn sẽ nhận được cảnh báo tại đây khi có thay đổi trạng thái đề tài.');
    showNotification(0);
  });
});

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const user = API.getUser();
  if (!user) { location.href = '/'; return; }

  document.getElementById('user-name').textContent = user.full_name;
  document.getElementById('user-role').textContent = user.role;
  document.getElementById('logout-btn').onclick = () => API.logout();

  buildNav(user.role);
  const first = document.querySelector('nav a[data-page]');
  if (first) navigate(first.dataset.page);
});

function buildNav(role) {
  const nav = document.getElementById('nav');
  const links = [];
  const add = (page, label) => links.push(`<a data-page="${page}" onclick="navigate('${page}')">${label}</a>`);

  // Common
  add('dashboard', '🏠 Dashboard');

  if (role === 'FACULTY') {
    add('my-proposals', '📄 Đề tài của tôi');
    add('create-proposal', '➕ Tạo đề tài');
    add('progress', '📊 Báo cáo tiến độ');
    add('acceptance', '✅ Nghiệm thu');
  }
  if (role === 'STAFF') {
    add('validate', '🔍 Kiểm tra hồ sơ');
    add('periods', '📅 Đợt đăng ký');
    add('councils', '🏛️ Hội đồng');
    add('acceptance-staff', '📋 Nghiệm thu');
  }
  if (role === 'LEADERSHIP') {
    add('approve', '✅ Phê duyệt');
    add('accept-confirm', '🎓 Xác nhận NThu');
    add('monitor', '📈 Theo dõi');
  }
  if (role === 'REVIEWER') {
    add('my-reviews', '📝 Phản biện');
    add('my-acceptance', '📋 Nghiệm thu');
  }
  if (role === 'ADMIN') {
    add('users', '👥 Người dùng');
    add('periods', '📅 Đợt đăng ký');
    add('catalog', '📚 Danh mục');
  }

  nav.innerHTML = links.join('');
}


// ══════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ══════════════════════════════════════════════════════════════════
registerPage('dashboard', async () => {
  const el = document.getElementById('page-dashboard');
  const user = API.getUser();
  
  let facultyStatsHtml = '';
  if (user.role === 'FACULTY') {
    try {
      const stats = await API.get('/proposals/stats/faculty');
      const s = stats.stats || {};
      facultyStatsHtml = `
        <h4 style="margin-top:20px">Thống kê đề tài</h4>
        <div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap">
          <div class="card" style="flex:1;min-width:120px;text-align:center"><h3>${s['DRAFT']||0}</h3><p>Bản nháp</p></div>
          <div class="card" style="flex:1;min-width:120px;text-align:center"><h3>${s['SUBMITTED']||0}</h3><p>Đã nộp</p></div>
          <div class="card" style="flex:1;min-width:120px;text-align:center"><h3>${(s['REVISION_REQUESTED']||0)}</h3><p>Cần sửa</p></div>
          <div class="card" style="flex:1;min-width:120px;text-align:center"><h3>${s['VALIDATED']||0}</h3><p>Hợp lệ</p></div>
          <div class="card" style="flex:1;min-width:120px;text-align:center"><h3>${s['APPROVED']||0}</h3><p>Đã duyệt</p></div>
        </div>`;
    } catch(e) { console.error('Failed to load stats', e); }
  }

  el.innerHTML = `<div class="card"><h3>Chào mừng, ${user.full_name}!</h3>
    <p>Vai trò: <strong>${user.role}</strong> | Email: ${user.email}</p>
    <p>Sử dụng menu bên trái để điều hướng.</p></div>
    ${facultyStatsHtml}`;
});


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — MY PROPOSALS
// ══════════════════════════════════════════════════════════════════
registerPage('my-proposals', async () => {
  _myPropPage = 1;
  const el = document.getElementById('page-my-proposals');
  el.innerHTML = `<div class="section-header"><h2>Đề tài của tôi</h2></div><div id="msg-proposals"></div><div id="proposals-list">Đang tải...</div>`;
  await loadMyProposals();
});

async function loadMyProposals() {
  try {
    const data = await API.get(`/proposals?page=${_myPropPage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('proposals-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Chưa có đề tài nào.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Tên đề tài</th><th>Trạng thái</th><th>Đợt</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
      <tbody>${data.items.map(p => `
        <tr>
          <td>${p.title}</td>
          <td>${badge(p.status)}</td>
          <td>${p.period_title || '—'}</td>
          <td>${fmtDateShort(p.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewProposal('${p.id}')">Xem</button>
            ${p.status === 'DRAFT' || p.status === 'REVISION_REQUESTED' ? `
              <button class="btn btn-sm btn-warning" onclick="editProposal('${p.id}')">Sửa</button>
              <button class="btn btn-sm btn-primary" onclick="submitProposal('${p.id}')">Nộp</button>
            ` : ''}
          </td>
        </tr>`).join('')}
      </tbody></table>`;
    
    html += renderPagination(data.total, _myPropPage, 'gotoMyPropPage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('proposals-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoMyPropPage(p) { _myPropPage = p; loadMyProposals(); }

async function submitProposal(id) {
  if (!confirm('Xác nhận nộp đề tài này?')) return;
  try {
    await API.post(`/proposals/${id}/submit`);
    showMsg(document.getElementById('msg-proposals'), 'Nộp thành công!', 'success');
    await loadMyProposals();
  } catch(e) { showMsg(document.getElementById('msg-proposals'), e.message); }
}

async function viewProposal(id) {
  try {
    const p = await API.get(`/proposals/${id}`);
    const reviews = await API.get(`/reviews/proposal/${id}`).catch(() => null);
    const history = await API.get(`/proposals/${id}/history`).catch(() => []);

    let reviewHtml = '';
    if (reviews && reviews.length) {
      reviewHtml = `<h4 style="margin:20px 0 10px">📊 Đánh giá từ hội đồng phản biện</h4>
        ${reviews.map(r => `
          <div class="card" style="margin-bottom:12px; border-left:4px solid #3b82f6">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="font-weight:600">${r.reviewer_name || 'Phản biện'}</span>
              <span class="badge ${r.verdict === 'PASS' ? 'badge-success' : (r.verdict === 'FAIL' ? 'badge-danger' : 'badge-warning')}">${r.verdict}</span>
            </div>
            <p style="font-size:18px; font-weight:700; color:#2563eb; margin:8px 0">${r.score} điểm</p>
            ${r.criteria_scores ? `
              <div style="font-size:12px; background:#f8fafc; padding:8px; border-radius:4px; margin-bottom:8px">
                ${r.criteria_scores.map(cs => `<div style="display:flex; justify-content:space-between"><span>Tiêu chí ${cs.id}:</span> <span>${cs.score}</span></div>`).join('')}
              </div>` : ''}
            <p style="font-style:italic; color:#475569; font-size:13px">"${r.comments}"</p>
          </div>
        `).join('')}`;
    }

    const timelineHtml = history.map((h, i) => `
      <div class="timeline-item" style="display:flex; gap:12px; margin-bottom:12px; position:relative">
        <div style="width:12px; height:12px; border-radius:50%; background:#3b82f6; margin-top:4px; z-index:1"></div>
        ${i < history.length - 1 ? '<div style="position:absolute; left:5px; top:16px; bottom:-12px; width:2px; background:#e5e7eb"></div>' : ''}
        <div style="flex:1">
          <div style="display:flex; justify-content:space-between; font-size:13px">
            <span style="font-weight:600; color:#1e293b">${h.to_status}</span>
            <span style="color:#64748b">${fmtDate(h.changed_at)}</span>
          </div>
          <div style="color:#475569; font-size:12px">${h.action} ${h.note ? `— <span style="color:#ef4444">${h.note}</span>` : ''}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('modal-view-body').innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
        <div>
          <p><b>Trạng thái:</b> ${badge(p.status)}</p>
          <p><b>PI:</b> ${p.pi_name}</p>
          <p><b>Lĩnh vực:</b> ${p.field_name||'—'}</p>
          <p><b>Loại:</b> ${p.category_name||'—'}</p>
          <p><b>Thời gian:</b> ${p.duration_months||'—'} tháng</p>
          <p><b>Tài liệu:</b> ${p.attachment_url ? `<a href="${p.attachment_url}" target="_blank">🔗 Xem hồ sơ</a>` : '—'}</p>
          <div style="margin-top:12px; padding:10px; background:#f1f5f9; border-radius:6px">
            <p style="font-weight:600; font-size:13px; margin-bottom:4px">Tóm tắt:</p>
            <p style="font-size:13px; color:#334155">${p.summary || 'Chưa có tóm tắt.'}</p>
          </div>
        </div>
        <div>
          <h4 style="margin-bottom:12px">🕒 Lịch sử phê duyệt</h4>
          <div style="padding-left:4px">${timelineHtml}</div>
        </div>
      </div>
      ${reviewHtml}
    `;
    document.getElementById('modal-view-title').textContent = p.title;
    openModal('modal-view');
  } catch(e) { alert(e.message); }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — CREATE PROPOSAL
// ══════════════════════════════════════════════════════════════════
registerPage('create-proposal', async () => {
  const el = document.getElementById('page-create-proposal');
  const [fields, categories, periods] = await Promise.all([
    API.get('/catalog/research-fields'),
    API.get('/catalog/proposal-categories'),
    API.get('/periods?status=OPEN'),
  ]);
  const [users] = await Promise.all([API.get('/users?role=FACULTY&size=100')]);

  el.innerHTML = `<div class="section-header"><h2>Tạo đề tài mới</h2></div>
    <div id="msg-create"></div>
    <div class="card">
      <form id="create-form">
        <div class="form-group"><label>Tên đề tài *</label><input name="title" required></div>
        <div class="form-row">
          <div class="form-group"><label>Đợt đăng ký *</label><select name="period_id">
            ${periods.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Lĩnh vực *</label><select name="field_id">
            <option value="">— Chọn —</option>
            ${(fields.items||[]).map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Loại đề tài</label><select name="category_id">
            <option value="">— Chọn —</option>
            ${(categories.items||[]).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Thời gian (tháng) *</label><input name="duration_months" type="number" min="1" max="36"></div>
        </div>
        <div class="form-group"><label>Tài liệu đính kèm (URL)</label><input name="attachment_url" placeholder="https://..."></div>
        <div class="form-group"><label>Tóm tắt</label><textarea name="summary" rows="3"></textarea></div>
        <div class="form-group"><label>Mục tiêu</label><textarea name="objectives" rows="3"></textarea></div>
        <div class="form-group"><label>Phương pháp</label><textarea name="methodology" rows="3"></textarea></div>
        <div class="form-group"><label>Kết quả dự kiến</label><textarea name="expected_outcomes" rows="2"></textarea></div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button type="submit" name="action" value="draft" class="btn btn-secondary">💾 Lưu bản nháp</button>
          <button type="submit" name="action" value="submit" class="btn btn-primary">📤 Nộp ngay</button>
        </div>
      </form>
    </div>`;

  let submitNow = false;
  el.querySelectorAll('button[type=submit]').forEach(btn => {
    btn.addEventListener('click', () => { submitNow = btn.value === 'submit'; });
  });

  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      period_id: fd.get('period_id') || null,
      field_id: fd.get('field_id') || null,
      category_id: fd.get('category_id') || null,
      duration_months: fd.get('duration_months') ? parseInt(fd.get('duration_months')) : null,
      attachment_url: fd.get('attachment_url') || null,
      summary: fd.get('summary') || null,
      objectives: fd.get('objectives') || null,
      methodology: fd.get('methodology') || null,
      expected_outcomes: fd.get('expected_outcomes') || null,
      submit: submitNow,
    };
    try {
      await API.post('/proposals', body);
      showMsg(document.getElementById('msg-create'), 'Tạo đề tài thành công!', 'success');
      e.target.reset();
      navigate('my-proposals');
    } catch(err) { showMsg(document.getElementById('msg-create'), err.message); }
  });
});

// Edit Proposal Modal Logic
async function editProposal(id) {
  try {
    const p = await API.get(`/proposals/${id}`);
    const [fields, categories, periods] = await Promise.all([
      API.get('/catalog/research-fields'),
      API.get('/catalog/proposal-categories'),
      API.get('/periods?status=OPEN'),
    ]);
    
    document.getElementById('edit-prop-id').value = p.id;
    document.getElementById('edit-prop-title').value = p.title || '';
    document.getElementById('edit-prop-duration').value = p.duration_months || '';
    document.getElementById('edit-prop-attachment').value = p.attachment_url || '';
    document.getElementById('edit-prop-summary').value = p.summary || '';
    document.getElementById('edit-prop-objectives').value = p.objectives || '';
    document.getElementById('edit-prop-methodology').value = p.methodology || '';
    document.getElementById('edit-prop-outcomes').value = p.expected_outcomes || '';
    
    const periodSel = document.getElementById('edit-prop-period');
    periodSel.innerHTML = `<option value="">— Chọn —</option>` + periods.map(x => `<option value="${x.id}" ${p.period_id === x.id ? 'selected':''}>${x.title}</option>`).join('');
    
    const fieldSel = document.getElementById('edit-prop-field');
    fieldSel.innerHTML = `<option value="">— Chọn —</option>` + (fields.items||[]).map(x => `<option value="${x.id}" ${p.field_id === x.id ? 'selected':''}>${x.name}</option>`).join('');
    
    const catSel = document.getElementById('edit-prop-category');
    catSel.innerHTML = `<option value="">— Chọn —</option>` + (categories.items||[]).map(x => `<option value="${x.id}" ${p.category_id === x.id ? 'selected':''}>${x.name}</option>`).join('');

    openModal('modal-edit-proposal');
  } catch(e) { alert(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('edit-proposal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      period_id: fd.get('period_id') || null,
      field_id: fd.get('field_id') || null,
      category_id: fd.get('category_id') || null,
      duration_months: fd.get('duration_months') ? parseInt(fd.get('duration_months')) : null,
      attachment_url: fd.get('attachment_url') || null,
      summary: fd.get('summary') || null,
      objectives: fd.get('objectives') || null,
      methodology: fd.get('methodology') || null,
      expected_outcomes: fd.get('expected_outcomes') || null,
    };
    try {
      await API.put(`/proposals/${fd.get('id')}`, body);
      closeModal('modal-edit-proposal');
      showMsg(document.getElementById('msg-proposals'), 'Cập nhật đề xuất thành công!', 'success');
      if (typeof loadMyProposals === 'function') await loadMyProposals();
    } catch(err) { showMsg(document.getElementById('msg-edit-proposal'), err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — PROGRESS REPORT
// ══════════════════════════════════════════════════════════════════
registerPage('progress', async () => {
  const el = document.getElementById('page-progress');
  const data = await API.get('/proposals?status=IN_PROGRESS');
  el.innerHTML = `<div class="section-header"><h2>Báo cáo tiến độ</h2></div>
    <div id="msg-progress"></div>
    <div class="card">
      <div class="form-group"><label>Chọn đề tài đang thực hiện:</label>
        <select id="sel-progress-proposal" onchange="loadProgressReports()">
          <option value="">— Chọn đề tài —</option>
          ${data.items.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
        </select>
      </div>
      <div id="progress-list"></div>
      <div id="progress-form" style="display:none;margin-top:12px">
        <h4>Nộp báo cáo mới</h4>
        <form id="form-progress">
          <div class="form-row">
            <div class="form-group"><label>Kỳ báo cáo</label><input name="report_period" placeholder="VD: Tháng 3-4/2026"></div>
            <div class="form-group"><label>Tiến độ (%) *</label><input name="completion_pct" type="number" min="0" max="100" required></div>
          </div>
          <div class="form-group"><label>Nội dung *</label><textarea name="content" rows="4" required></textarea></div>
          <div class="form-group"><label>Khó khăn</label><textarea name="issues" rows="2"></textarea></div>
          <div class="form-group"><label>Kế hoạch tiếp theo *</label><textarea name="next_steps" rows="2" required></textarea></div>
          <button type="submit" class="btn btn-primary">Nộp báo cáo</button>
        </form>
      </div>
    </div>`;

  document.getElementById('form-progress').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('sel-progress-proposal').value;
    if (!pid) return;
    const fd = new FormData(e.target);
    try {
      await API.post(`/progress/proposals/${pid}`, {
        report_period: fd.get('report_period') || null,
        content: fd.get('content'),
        completion_pct: parseFloat(fd.get('completion_pct')),
        issues: fd.get('issues') || null,
        next_steps: fd.get('next_steps'),
      });
      showMsg(document.getElementById('msg-progress'), 'Nộp báo cáo thành công!', 'success');
      e.target.reset();
      await loadProgressReports();
    } catch(e) { showMsg(document.getElementById('msg-progress'), e.message); }
  });
});

async function loadProgressReports() {
  const pid = document.getElementById('sel-progress-proposal').value;
  const listEl = document.getElementById('progress-list');
  const formEl = document.getElementById('progress-form');
  if (!pid) { listEl.innerHTML = ''; formEl.style.display = 'none'; return; }
  formEl.style.display = 'block';
  try {
    const reports = await API.get(`/progress/proposals/${pid}`);
    if (!reports.length) { listEl.innerHTML = '<p class="empty">Chưa có báo cáo.</p>'; return; }
    listEl.innerHTML = `<table>
      <tr><th>#</th><th>Kỳ</th><th>Tiến độ</th><th>Ngày nộp</th></tr>
      ${reports.map(r => `<tr><td>${r.report_order}</td><td>${r.report_period||'—'}</td><td>${r.completion_pct}%</td><td>${fmtDateShort(r.submitted_at)}</td></tr>`).join('')}
    </table>`;
  } catch(e) { listEl.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — ACCEPTANCE (NGHIỆM THU)
// ══════════════════════════════════════════════════════════════════
registerPage('acceptance', async () => {
  const el = document.getElementById('page-acceptance');
  const data = await API.get('/proposals?status=IN_PROGRESS');
  const rev = await API.get('/proposals?status=ACCEPTANCE_REVISION_REQUESTED').catch(() => ({ items: [] }));
  const allProposals = [...data.items, ...rev.items];
  el.innerHTML = `<div class="section-header"><h2>Nộp hồ sơ nghiệm thu</h2></div>
    <div id="msg-acceptance"></div>
    <div class="card">
      <div class="form-group"><label>Chọn đề tài:</label>
        <select id="sel-acceptance-proposal">
          <option value="">— Chọn —</option>
          ${allProposals.map(p => `<option value="${p.id}">${p.title} (${p.status})</option>`).join('')}
        </select>
      </div>
      <form id="form-acceptance" style="margin-top:12px">
        <div class="form-group"><label>Báo cáo tổng kết *</label><textarea name="final_report" rows="5" required></textarea></div>
        <div class="form-group"><label>Kết quả đạt được *</label><textarea name="achievements" rows="3" required></textarea></div>
        <div class="form-group"><label>Sản phẩm/Tài liệu</label><textarea name="deliverables" rows="2"></textarea></div>
        <button type="submit" class="btn btn-primary">Nộp hồ sơ nghiệm thu</button>
      </form>
    </div>`;

  document.getElementById('form-acceptance').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('sel-acceptance-proposal').value;
    if (!pid) return alert('Chọn đề tài');
    const fd = new FormData(e.target);
    try {
      await API.post(`/acceptance/proposals/${pid}`, {
        final_report: fd.get('final_report'),
        achievements: fd.get('achievements'),
        deliverables: fd.get('deliverables') || null,
      });
      showMsg(document.getElementById('msg-acceptance'), 'Nộp hồ sơ thành công!', 'success');
      e.target.reset();
    } catch(err) { showMsg(document.getElementById('msg-acceptance'), err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — VALIDATE
// ══════════════════════════════════════════════════════════════════
registerPage('validate', async () => {
  _validatePage = 1;
  const el = document.getElementById('page-validate');
  el.innerHTML = `<div class="section-header"><h2>Kiểm tra hồ sơ</h2></div><div id="msg-validate"></div><div id="validate-list">Đang tải...</div>`;
  await loadValidateList();
});

async function loadValidateList() {
  try {
    const data = await API.get(`/proposals?status=SUBMITTED&page=${_validatePage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('validate-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Không có hồ sơ chờ kiểm tra.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Tên đề tài</th><th>PI</th><th>Đợt</th><th>Ngày nộp</th><th>Thao tác</th></tr></thead>
      <tbody>${data.items.map(p => `
        <tr>
          <td>${p.title}</td><td>${p.pi_name}</td><td>${p.period_title||'—'}</td><td>${fmtDateShort(p.submitted_at)}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewProposal('${p.id}')">Xem</button>
            <button class="btn btn-sm btn-success" onclick="validateProposal('${p.id}','APPROVE')">✓ Hợp lệ</button>
            <button class="btn btn-sm btn-warning" onclick="openReturnModal('${p.id}')">↩ Trả về</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
    
    html += renderPagination(data.total, _validatePage, 'gotoValidatePage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('validate-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoValidatePage(p) { _validatePage = p; loadValidateList(); }

async function validateProposal(id, action, reason) {
  try {
    await API.post(`/proposals/${id}/validate`, { action, reason });
    showMsg(document.getElementById('msg-validate'), action === 'APPROVE' ? 'Đã xác nhận hợp lệ!' : 'Đã trả về cho giảng viên!', 'success');
    await loadValidateList();
  } catch(e) { showMsg(document.getElementById('msg-validate'), e.message); }
}

let _returnId = null;
function openReturnModal(id) {
  _returnId = id;
  document.getElementById('return-reason').value = '';
  openModal('modal-return');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-return')?.addEventListener('click', async () => {
    const reason = document.getElementById('return-reason').value.trim();
    if (!reason || reason.length < 10) return alert('Lý do tối thiểu 10 ký tự');
    await validateProposal(_returnId, 'RETURN', reason);
    closeModal('modal-return');
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — PERIODS
// ══════════════════════════════════════════════════════════════════
registerPage('periods', async () => {
  _periodPage = 1;
  const el = document.getElementById('page-periods');
  el.innerHTML = `<div class="section-header"><h2>Đợt đăng ký</h2>
    <button class="btn btn-primary" onclick="openModal('modal-period')">+ Tạo đợt</button></div>
    <div id="msg-periods"></div><div id="periods-list">Đang tải...</div>`;
  await loadPeriods();
});

async function loadPeriods() {
  try {
    const data = await API.get(`/periods?page=${_periodPage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('periods-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Chưa có đợt đăng ký.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Tiêu đề</th><th>Từ</th><th>Đến</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>${data.items.map(p => `
        <tr>
          <td>${p.title}</td><td>${p.start_date}</td><td>${p.end_date}</td><td>${badge(p.status)}</td>
          <td>
            ${p.status === 'DRAFT' ? `<button class="btn btn-sm btn-success" onclick="periodAction('${p.id}','open')">Mở</button>` : ''}
            ${p.status === 'OPEN' ? `<button class="btn btn-sm btn-danger" onclick="periodAction('${p.id}','close')">Đóng</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody></table>`;
    
    html += renderPagination(data.total, _periodPage, 'gotoPeriodPage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('periods-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoPeriodPage(p) { _periodPage = p; loadPeriods(); }

async function periodAction(id, action) {
  try {
    await API.post(`/periods/${id}/${action}`);
    showMsg(document.getElementById('msg-periods'), 'Cập nhật thành công!', 'success');
    await loadPeriods();
  } catch(e) { showMsg(document.getElementById('msg-periods'), e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-period')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/periods', {
        title: fd.get('title'), description: fd.get('description') || null,
        start_date: fd.get('start_date'), end_date: fd.get('end_date'),
      });
      closeModal('modal-period');
      showMsg(document.getElementById('msg-periods'), 'Tạo đợt thành công!', 'success');
      e.target.reset(); await loadPeriods();
    } catch(err) { alert(err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — COUNCILS
// ══════════════════════════════════════════════════════════════════
registerPage('councils', async () => {
  const el = document.getElementById('page-councils');
  el.innerHTML = `<div class="section-header"><h2>Quản lý Hội đồng</h2></div>
    <div id="msg-councils"></div>
    <div class="card">
      <h3>Tạo hội đồng phản biện</h3>
      <form id="form-council">
        <div class="form-group"><label>Đề tài (VALIDATED):</label>
          <select name="proposal_id" id="sel-council-proposal"><option value="">Đang tải...</option></select>
        </div>
        <div class="form-group"><label>Tên hội đồng:</label><input name="name" required></div>
        <div class="form-group"><label>Loại:</label>
          <select name="council_type">
            <option value="PROPOSAL_REVIEW">Phản biện đề tài</option>
            <option value="ACCEPTANCE">Nghiệm thu</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Tạo hội đồng</button>
      </form>
    </div>
    <div id="councils-list">Đang tải...</div>`;

  // Load proposals for council form
  const [valProposals, accProposals] = await Promise.all([
    API.get('/proposals?status=VALIDATED&size=50'),
    API.get('/proposals?status=ACCEPTANCE_SUBMITTED&size=50'),
  ]);
  const allP = [...valProposals.items, ...accProposals.items];
  document.getElementById('sel-council-proposal').innerHTML =
    `<option value="">— Chọn —</option>` + allP.map(p => `<option value="${p.id}">${p.title} (${p.status})</option>`).join('');

  document.getElementById('form-council').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/councils', {
        name: fd.get('name'), council_type: fd.get('council_type'),
        proposal_id: fd.get('proposal_id'),
      });
      showMsg(document.getElementById('msg-councils'), 'Tạo hội đồng thành công!', 'success');
      e.target.reset(); await loadCouncils();
    } catch(err) { showMsg(document.getElementById('msg-councils'), err.message); }
  });

  await loadCouncils();
});

async function loadCouncils() {
  try {
    const councils = await API.get('/councils');
    const el = document.getElementById('councils-list');
    if (!councils.length) { el.innerHTML = '<p class="empty">Chưa có hội đồng nào.</p>'; return; }

    let rows = councils.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.proposal_title}</td>
        <td>${badge(c.status)}</td>
        <td>
          ${c.status === 'FORMING' ? `<button class="btn btn-sm btn-primary" onclick="manageCouncil('${c.id}')">Thiết lập</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="viewCouncil('${c.id}')">Chi tiết</button>
        </td>
      </tr>`).join('');

    el.innerHTML = `<div class="card" style="margin-top:16px">
      <table><thead><tr><th>Tên hội đồng</th><th>Đề tài</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  } catch(e) { document.getElementById('councils-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

async function viewCouncil(id) {
  try {
    const c = await API.get(`/councils/${id}`);
    document.getElementById('modal-view-title').textContent = c.name;
    document.getElementById('modal-view-body').innerHTML = `
      <p><b>Đề tài:</b> ${c.proposal_title}</p>
      <p><b>Loại:</b> ${c.council_type}</p>
      <p><b>Trạng thái:</b> ${badge(c.status)}</p>
      <p><b>Địa điểm:</b> ${c.location || '—'}</p>
      <p><b>Ngày họp:</b> ${c.scheduled_date || '—'}</p>
      <h4>Thành viên</h4>
      <ul>${c.members.map(m => `<li>${m.full_name} (${m.role_in_council})</li>`).join('')}</ul>
    `;
    openModal('modal-view');
  } catch(e) { alert(e.message); }
}

async function manageCouncil(councilId) {
  try {
    const c = await API.get(`/councils/${councilId}`);
    const reviewers = await API.get('/users?role=REVIEWER&size=100');
    
    document.getElementById('modal-council-title').textContent = `Thiết lập: ${c.name}`;
    document.getElementById('council-proposal-id').value = councilId; // Using this as councilId now

    const currentMemberIds = c.members.map(m => m.user_id);
    document.getElementById('council-reviewer-list').innerHTML = reviewers.items.map(r => `
      <label style="display:block;padding:4px;border-bottom:1px solid #f3f4f6">
        <input type="checkbox" value="${r.id}" ${currentMemberIds.includes(r.id) ? 'checked' : ''}> 
        ${r.full_name} (${r.academic_rank || ''} ${r.academic_title || ''})
      </label>
    `).join('');

    openModal('modal-council-manage');
  } catch(e) { alert(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-create-council-members')?.addEventListener('click', async () => {
    const councilId = document.getElementById('council-proposal-id').value;
    const checked = [...document.querySelectorAll('#council-reviewer-list input:checked')].map(c => c.value);
    
    if (checked.length < 2) return alert('Hội đồng phải có ít nhất 2 phản biện');

    try {
      // 1. Clear existing members (or just add new ones, but for MVP let's assume we set the full list)
      // The API doesn't have a "sync members" endpoint, so we'll just add those that are not there.
      const c = await API.get(`/councils/${councilId}`);
      const existingIds = c.members.map(m => m.user_id);
      
      for (const uid of checked) {
        if (!existingIds.includes(uid)) {
          await API.post(`/councils/${councilId}/members`, { user_id: uid, role_in_council: 'REVIEWER' });
        }
      }
      
      // 2. Activate council
      if (confirm('Xác nhận kích hoạt hội đồng và bắt đầu quá trình phản biện?')) {
        await API.post(`/councils/${councilId}/activate`);
        showMsg(document.getElementById('msg-councils'), 'Hội đồng đã được kích hoạt!', 'success');
        closeModal('modal-council-manage');
        await loadCouncils();
      }
    } catch(e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — ACCEPTANCE STAFF
// ══════════════════════════════════════════════════════════════════
registerPage('acceptance-staff', async () => {
  const el = document.getElementById('page-acceptance-staff');
  const data = await API.get('/proposals?status=ACCEPTANCE_SUBMITTED&size=50').catch(() => ({ items: [] }));

  el.innerHTML = `<div class="section-header"><h2>Kiểm tra hồ sơ nghiệm thu</h2></div>
    <div id="msg-acc-staff"></div>
    ${!data.items.length ? '<p class="empty">Không có hồ sơ nghiệm thu.</p>' :
    `<table><thead><tr><th>Đề tài</th><th>PI</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
    <tbody>${data.items.map(p => `<tr>
      <td>${p.title}</td><td>${p.pi_name}</td><td>${badge(p.status)}</td>
      <td><button class="btn btn-sm btn-warning" onclick="returnDossier('${p.id}')">↩ Trả về</button></td>
    </tr>`).join('')}</tbody></table>`}`;
});

async function returnDossier(proposalId) {
  const reason = prompt('Lý do trả về (tối thiểu 10 ký tự):');
  if (!reason || reason.length < 10) return alert('Lý do quá ngắn');
  try {
    await API.post(`/acceptance/proposals/${proposalId}/return`, { reason });
    showMsg(document.getElementById('msg-acc-staff'), 'Đã trả về!', 'success');
    navigate('acceptance-staff');
  } catch(e) { showMsg(document.getElementById('msg-acc-staff'), e.message); }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: LEADERSHIP — APPROVE
// ══════════════════════════════════════════════════════════════════
registerPage('approve', async () => {
  _approvePage = 1;
  const el = document.getElementById('page-approve');
  el.innerHTML = `<div class="section-header"><h2>Phê duyệt đề tài</h2></div>
    <div id="msg-approve"></div><div id="approve-list">Đang tải...</div>`;
  await loadApproveList();
});

async function loadApproveList() {
  try {
    const data = await API.get(`/proposals?status=REVIEWED&page=${_approvePage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('approve-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Không có đề tài chờ phê duyệt.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Tên đề tài</th><th>PI</th><th>Lĩnh vực</th><th>Thao tác</th></tr></thead>
      <tbody>${data.items.map(p => `
        <tr>
          <td>${p.title}</td><td>${p.pi_name}</td><td>${p.field_name||'—'}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewReviewsForApproval('${p.id}')">Xem đánh giá</button>
            <button class="btn btn-sm btn-success" onclick="makeDecision('${p.id}','APPROVED')">✓ Phê duyệt</button>
            <button class="btn btn-sm btn-danger" onclick="openRejectModal('${p.id}')">✗ Từ chối</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
    
    html += renderPagination(data.total, _approvePage, 'gotoApprovePage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('approve-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoApprovePage(p) { _approvePage = p; loadApproveList(); }

async function viewReviewsForApproval(id) {
  try {
    const reviews = await API.get(`/reviews/proposal/${id}`);
    const avg = reviews.length ? (reviews.reduce((s,r) => s + parseFloat(r.score||0), 0) / reviews.length).toFixed(1) : '—';
    document.getElementById('modal-view-title').textContent = 'Kết quả phản biện';
    document.getElementById('modal-view-body').innerHTML = `
      <p><b>Điểm trung bình: ${avg}</b></p>
      <table><tr><th>Phản biện</th><th>Điểm</th><th>Kết luận</th><th>Nhận xét</th></tr>
      ${reviews.map(r => `<tr><td>${r.reviewer_name}</td><td>${r.score||'—'}</td><td>${r.verdict||'—'}</td><td>${r.comments||'—'}</td></tr>`).join('')}
      </table>`;
    openModal('modal-view');
  } catch(e) { alert(e.message); }
}

async function makeDecision(id, decision, reason) {
  try {
    await API.post(`/proposals/${id}/approve`, { decision, reason });
    showMsg(document.getElementById('msg-approve'), decision === 'APPROVED' ? 'Đã phê duyệt!' : 'Đã từ chối!', 'success');
    await loadApproveList();
  } catch(e) { showMsg(document.getElementById('msg-approve'), e.message); }
}

let _rejectId = null;
function openRejectModal(id) {
  _rejectId = id;
  document.getElementById('reject-reason').value = '';
  openModal('modal-reject');
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-reject')?.addEventListener('click', async () => {
    const reason = document.getElementById('reject-reason').value.trim();
    if (!reason || reason.length < 20) return alert('Lý do tối thiểu 20 ký tự');
    await makeDecision(_rejectId, 'REJECTED', reason);
    closeModal('modal-reject');
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: LEADERSHIP — CONFIRM ACCEPTANCE
// ══════════════════════════════════════════════════════════════════
registerPage('accept-confirm', async () => {
  const el = document.getElementById('page-accept-confirm');
  const data = await API.get('/proposals?status=UNDER_ACCEPTANCE_REVIEW&size=50').catch(() => ({ items: [] }));
  el.innerHTML = `<div class="section-header"><h2>Xác nhận nghiệm thu</h2></div>
    <div id="msg-confirm"></div>
    ${!data.items.length ? '<p class="empty">Không có đề tài chờ xác nhận.</p>' :
    `<table><thead><tr><th>Đề tài</th><th>PI</th><th>Thao tác</th></tr></thead>
    <tbody>${data.items.map(p => `<tr>
      <td>${p.title}</td><td>${p.pi_name}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="confirmAcceptance('${p.id}','ACCEPTED')">✓ Đạt</button>
        <button class="btn btn-sm btn-danger" onclick="confirmAcceptance('${p.id}','ACCEPTANCE_FAILED')">✗ Không đạt</button>
      </td>
    </tr>`).join('')}</tbody></table>`}`;
});

async function confirmAcceptance(id, decision) {
  if (!confirm(`Xác nhận ${decision === 'ACCEPTED' ? 'NGHIỆM THU ĐẠT' : 'NGHIỆM THU KHÔNG ĐẠT'}?`)) return;
  try {
    await API.post(`/proposals/${id}/confirm-acceptance`, { decision });
    showMsg(document.getElementById('msg-confirm'), 'Đã xác nhận!', 'success');
    navigate('accept-confirm');
  } catch(e) { showMsg(document.getElementById('msg-confirm'), e.message); }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: LEADERSHIP — MONITOR
// ══════════════════════════════════════════════════════════════════
registerPage('monitor', async () => {
  _monitorPage = 1;
  const el = document.getElementById('page-monitor');
  el.innerHTML = `<div class="section-header"><h2>Theo dõi tiến độ</h2></div><div id="monitor-list">Đang tải...</div>`;
  await loadMonitorList();
});

async function loadMonitorList() {
  try {
    const data = await API.get(`/progress?page=${_monitorPage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('monitor-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Chưa có báo cáo.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Đề tài</th><th>Người nộp</th><th>#</th><th>Tiến độ</th><th>Ngày nộp</th></tr></thead>
      <tbody>${data.items.map(r => `<tr>
        <td>${r.proposal_id}</td><td>${r.submitted_by_name}</td><td>${r.report_order}</td>
        <td>${r.completion_pct}%</td><td>${fmtDateShort(r.submitted_at)}</td>
      </tr>`).join('')}</tbody></table>`;
    
    html += renderPagination(data.total, _monitorPage, 'gotoMonitorPage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('monitor-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoMonitorPage(p) { _monitorPage = p; loadMonitorList(); }


// ══════════════════════════════════════════════════════════════════
// PAGE: REVIEWER — MY REVIEWS
// ══════════════════════════════════════════════════════════════════
registerPage('my-reviews', async () => {
  const el = document.getElementById('page-my-reviews');
  el.innerHTML = `<div class="section-header"><h2>Phản biện được phân công</h2></div>
    <div id="msg-my-reviews"></div><div id="my-reviews-list">Đang tải...</div>`;
  try {
    const reviews = await API.get('/reviews/my');
    const el2 = document.getElementById('my-reviews-list');
    if (!reviews.length) { el2.innerHTML = '<p class="empty">Chưa có phân công.</p>'; return; }
    el2.innerHTML = `<table>
      <thead><tr><th>Đề tài</th><th>Trạng thái</th><th>Điểm</th><th>Thao tác</th></tr></thead>
      <tbody>${reviews.map(r => `<tr>
        <td title="${r.proposal_id}">${r.proposal_title || '—'}</td><td>${badge(r.status)}</td><td>${r.score||'—'}</td>
        <td>${r.status === 'PENDING' ? `<button class="btn btn-sm btn-primary" onclick="openSubmitReview('${r.council_id}','${r.proposal_id}')">Nộp đánh giá</button>` : '—'}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch(e) { document.getElementById('my-reviews-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
});

let _reviewCtx = {};
let _currentCriteria = [];

async function openSubmitReview(councilId, proposalId) {
  _reviewCtx = { councilId, proposalId };
  document.getElementById('review-score').value = '0';
  document.getElementById('review-comments').value = '';
  document.getElementById('review-verdict').value = 'PASS';
  
  const criteriaInputs = document.getElementById('criteria-inputs');
  const container = document.getElementById('criteria-form-container');
  criteriaInputs.innerHTML = 'Đang tải tiêu chí...';
  container.style.display = 'block';

  try {
    // For MVP, we'll fetch the first active template
    const templates = await API.get('/catalog/evaluation-criteria?is_active=true');
    if (templates.items && templates.items.length > 0) {
      _currentCriteria = templates.items[0].criteria_json;
      criteriaInputs.innerHTML = _currentCriteria.map(c => `
        <div class="form-group" style="margin-bottom:8px">
          <label style="font-size:12px">${c.label} (Tối đa ${c.max_score})</label>
          <input type="number" class="criteria-input" data-id="${c.id}" data-max="${c.max_score}" 
                 min="0" max="${c.max_score}" value="0" step="0.5" 
                 oninput="calcTotalReviewScore()" style="padding:4px; font-size:13px">
        </div>
      `).join('');
    } else {
      container.style.display = 'none';
      document.getElementById('review-score').readOnly = false;
      document.getElementById('review-score').style.background = '#fff';
    }
  } catch(e) {
    console.error('Failed to load criteria', e);
    criteriaInputs.innerHTML = '<p style="color:red;font-size:12px">Không thể tải tiêu chí.</p>';
  }

  openModal('modal-submit-review');
}

function calcTotalReviewScore() {
  let total = 0;
  document.querySelectorAll('.criteria-input').forEach(input => {
    total += parseFloat(input.value || 0);
  });
  document.getElementById('review-score').value = total;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-review')?.addEventListener('click', async () => {
    const score = parseFloat(document.getElementById('review-score').value);
    const comments = document.getElementById('review-comments').value.trim();
    const verdict = document.getElementById('review-verdict').value;
    if (isNaN(score)) return alert('Nhập điểm hợp lệ');
    if (comments.length < 50) return alert('Nhận xét tối thiểu 50 ký tự');
    try {
      const criteriaScores = [...document.querySelectorAll('.criteria-input')].map(input => ({
        id: input.dataset.id,
        score: parseFloat(input.value || 0)
      }));

      await API.post('/reviews', {
        council_id: _reviewCtx.councilId,
        proposal_id: _reviewCtx.proposalId,
        score, comments, verdict,
        criteria_scores: criteriaScores,
      });
      closeModal('modal-submit-review');
      showMsg(document.getElementById('msg-my-reviews'), 'Nộp đánh giá thành công!', 'success');
      navigate('my-reviews');
    } catch(e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: REVIEWER — ACCEPTANCE REVIEWS
// ══════════════════════════════════════════════════════════════════
registerPage('my-acceptance', async () => {
  const el = document.getElementById('page-my-acceptance');
  el.innerHTML = `<div class="section-header"><h2>Nghiệm thu được phân công</h2></div>
    <div id="msg-my-acc"></div><div id="my-acc-list">Đang tải...</div>`;
  try {
    const reviews = await API.get('/acceptance/my-reviews');
    const el2 = document.getElementById('my-acc-list');
    if (!reviews.length) { el2.innerHTML = '<p class="empty">Chưa có phân công.</p>'; return; }
    el2.innerHTML = `<table>
      <thead><tr><th>Hồ sơ</th><th>Hội đồng</th><th>Trạng thái</th><th>Điểm</th><th>Thao tác</th></tr></thead>
      <tbody>${reviews.map(r => `<tr>
        <td>${r.dossier_id}</td><td>${r.council_id}</td><td>${badge(r.status)}</td><td>${r.score||'—'}</td>
        <td>${r.status === 'PENDING' ? `<button class="btn btn-sm btn-primary" onclick="openAccReview('${r.dossier_id}','${r.council_id}')">Nộp đánh giá</button>` : '—'}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch(e) { document.getElementById('my-acc-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
});

let _accCtx = {};
function openAccReview(dossierId, councilId) {
  _accCtx = { dossierId, councilId };
  document.getElementById('acc-score').value = '';
  document.getElementById('acc-comments').value = '';
  document.getElementById('acc-verdict').value = 'PASS';
  openModal('modal-acc-review');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-acc-review')?.addEventListener('click', async () => {
    const score = parseFloat(document.getElementById('acc-score').value);
    const comments = document.getElementById('acc-comments').value.trim();
    const verdict = document.getElementById('acc-verdict').value;
    if (isNaN(score)) return alert('Nhập điểm hợp lệ');
    try {
      await API.post(`/acceptance/${_accCtx.dossierId}/reviews`, {
        dossier_id: _accCtx.dossierId, council_id: _accCtx.councilId,
        score, comments, verdict,
      });
      closeModal('modal-acc-review');
      showMsg(document.getElementById('msg-my-acc'), 'Nộp đánh giá thành công!', 'success');
      navigate('my-acceptance');
    } catch(e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: ADMIN — USERS
// ══════════════════════════════════════════════════════════════════
registerPage('users', async () => {
  _userPage = 1;
  const el = document.getElementById('page-users');
  el.innerHTML = `<div class="section-header"><h2>Quản lý người dùng</h2>
    <button class="btn btn-primary" onclick="openModal('modal-user')">+ Thêm user</button></div>
    <div id="msg-users"></div><div id="users-list">Đang tải...</div>`;
  await loadUsers();
});

async function loadUsers() {
  try {
    const data = await API.get(`/users?page=${_userPage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('users-list');
    let html = `<table>
      <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Khoa</th><th>Trạng thái</th></tr></thead>
      <tbody>${data.items.map(u => `<tr>
        <td>${u.full_name}</td><td>${u.email}</td><td>${badge(u.role)}</td>
        <td>${u.department_name||'—'}</td><td>${u.is_active ? '✅' : '❌'}</td>
      </tr>`).join('')}</tbody></table>`;
    
    html += renderPagination(data.total, _userPage, 'gotoUserPage');
    el.innerHTML = html;
  } catch(e) { document.getElementById('users-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoUserPage(p) { _userPage = p; loadUsers(); }

document.addEventListener('DOMContentLoaded', async () => {
  const depts = await API.get('/catalog/departments').catch(() => []);
  const deptSel = document.getElementById('user-dept');
  if (deptSel) deptSel.innerHTML = `<option value="">— Chọn Khoa —</option>` + depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  document.getElementById('form-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/users', {
        email: fd.get('email'), password: fd.get('password'),
        full_name: fd.get('full_name'), role: fd.get('role'),
        department_id: fd.get('department_id') || null,
        academic_rank: fd.get('academic_rank') || null,
        academic_title: fd.get('academic_title') || null,
      });
      closeModal('modal-user');
      showMsg(document.getElementById('msg-users'), 'Tạo user thành công!', 'success');
      e.target.reset(); await loadUsers();
    } catch(err) { alert(err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: ADMIN/STAFF — CATALOG
// ══════════════════════════════════════════════════════════════════

const CATALOG_CONFIGS = {
  'departments': {
    title: 'Khoa / Phòng',
    cols: [{k:'name', label:'Tên'}, {k:'code', label:'Mã'}],
    schema: [{k:'name', label:'Tên *', type:'text', req:true}, {k:'code', label:'Mã *', type:'text', req:true}]
  },
  'research-fields': {
    title: 'Lĩnh vực nghiên cứu',
    cols: [{k:'name', label:'Tên'}, {k:'code', label:'Mã'}],
    schema: [{k:'name', label:'Tên *', type:'text', req:true}, {k:'code', label:'Mã *', type:'text', req:true}]
  },
  'proposal-categories': {
    title: 'Loại đề tài',
    cols: [{k:'name', label:'Tên'}, {k:'level', label:'Cấp'}, {k:'max_duration_months', label:'T.gian Tối đa'}],
    schema: [
      {k:'name', label:'Tên *', type:'text', req:true}, {k:'code', label:'Mã *', type:'text', req:true},
      {k:'level', label:'Cấp *', type:'select', req:true, opts:[{v:'UNIVERSITY',l:'Cấp Trường'}, {v:'FACULTY',l:'Cấp Khoa'}, {v:'MINISTERIAL',l:'Cấp Bộ'}]},
      {k:'max_duration_months', label:'TG tối đa (tháng)', type:'number'},
      {k:'description', label:'Mô tả', type:'textarea'}
    ]
  },
  'council-types': {
    title: 'Loại hội đồng',
    cols: [{k:'name', label:'Tên'}, {k:'code', label:'Mã'}],
    schema: [{k:'name', label:'Tên *', type:'text', req:true}, {k:'code', label:'Mã *', type:'text', req:true}, {k:'description', label:'Mô tả', type:'textarea'}]
  },
  'evaluation-criteria': {
    title: 'Mẫu tiêu chí ĐG',
    cols: [{k:'name', label:'Tên'}],
    schema: [{k:'name', label:'Tên *', type:'text', req:true}, {k:'description', label:'Mô tả', type:'textarea'}]
  },
  'proposal-statuses': {
    title: 'Cấu hình trạng thái',
    cols: [{k:'name', label:'Tên'}, {k:'code', label:'Mã'}],
    schema: [{k:'name', label:'Tên *', type:'text', req:true}, {k:'code', label:'Mã *', type:'text', req:true}, {k:'description', label:'Mô tả', type:'textarea'}]
  }
};

let _currentCatalog = 'departments';
let _catPage = 1;
let _catEditId = null;

registerPage('catalog', async () => {
  renderCatalogNav();
  document.getElementById('catalog-search').oninput = debounce(() => { _catPage=1; loadCatalogData(); }, 400);
  document.getElementById('catalog-status').onchange = () => { _catPage=1; loadCatalogData(); };
  document.getElementById('btn-add-catalog').onclick = () => openCatalogForm(null);
  
  document.getElementById('form-catalog').onsubmit = handleCatalogSubmit;
  
  await changeCatalogTab('departments');
});

function debounce(func, wait) {
  let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

function renderCatalogNav() {
  const ul = document.getElementById('catalog-nav');
  ul.innerHTML = Object.entries(CATALOG_CONFIGS).map(([k, v]) => `
    <li style="margin-bottom:8px">
      <a href="#" class="btn btn-sm ${k === _currentCatalog ? 'btn-primary' : 'btn-secondary'}" 
         style="display:block; text-align:left; border-radius:4px"
         onclick="changeCatalogTab('${k}')">${v.title}</a>
    </li>
  `).join('');
}

async function changeCatalogTab(key) {
  _currentCatalog = key;
  _catPage = 1;
  document.getElementById('catalog-search').value = '';
  document.getElementById('catalog-status').value = '';
  renderCatalogNav();
  await loadCatalogData();
}

async function loadCatalogData() {
  const cfg = CATALOG_CONFIGS[_currentCatalog];
  const search = document.getElementById('catalog-search').value.trim();
  const isActive = document.getElementById('catalog-status').value;
  
  const thead = document.getElementById('catalog-table-head');
  const tbody = document.getElementById('catalog-table-body');
  
  thead.innerHTML = `<tr>${cfg.cols.map(c => `<th>${c.label}</th>`).join('')}<th>Trạng thái</th><th>Hành động</th></tr>`;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center">Đang tải...</td></tr>';
  
  try {
    const res = await API.getCatalogs(_currentCatalog, { page: _catPage, size: 10, search, is_active: isActive });
    if (!res.items.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center" class="empty">Không tìm thấy dữ liệu.</td></tr>';
    } else {
      tbody.innerHTML = res.items.map(item => `
        <tr style="${!item.is_active ? 'opacity:0.6' : ''}">
          ${cfg.cols.map(c => `<td>${item[c.k] || '—'}</td>`).join('')}
          <td>${item.is_active ? badge('ACTIVE') : badge('DISABLED')}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick='openCatalogForm(${JSON.stringify(item)})'>Sửa</button>
            ${item.is_active ? `<button class="btn btn-sm btn-danger" onclick="deleteCatalogItem('${item.id}')">Vô hiệu hóa</button>` : ''}
          </td>
        </tr>
      `).join('');
    }
    
    // Pagination
    const totalPages = Math.ceil(res.total / 10);
    let phtml = '';
    for(let i=1; i<=totalPages; i++) {
      phtml += `<button class="btn btn-sm ${i===_catPage?'btn-primary':'btn-secondary'}" onclick="gotoCatalogPage(${i})">${i}</button>`;
    }
    document.getElementById('catalog-pagination').innerHTML = phtml;
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="10" class="alert alert-error">${e.message}</td></tr>`;
  }
}

function gotoCatalogPage(p) { _catPage = p; loadCatalogData(); }

function openCatalogForm(item) {
  _catEditId = item ? item.id : null;
  const cfg = CATALOG_CONFIGS[_currentCatalog];
  document.getElementById('modal-catalog-title').textContent = (item ? 'Sửa ' : 'Tạo mới ') + cfg.title;
  
  let html = '';
  cfg.schema.forEach(s => {
    const val = item ? (item[s.k] || '') : '';
    html += `<div class="form-group"><label>${s.label}</label>`;
    if (s.type === 'select') {
      html += `<select name="${s.k}" ${s.req?'required':''}>
        <option value="">— Chọn —</option>
        ${s.opts.map(o => `<option value="${o.v}" ${val===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select>`;
    } else if (s.type === 'textarea') {
      html += `<textarea name="${s.k}" ${s.req?'required':''}>${val}</textarea>`;
    } else {
      html += `<input type="${s.type}" name="${s.k}" value="${val}" ${s.req?'required':''}>`;
    }
    html += `</div>`;
  });
  
  if (item) {
    html += `<div class="form-group"><label>Trạng thái hoạt động</label>
      <select name="is_active"><option value="true" ${item.is_active?'selected':''}>Có</option><option value="false" ${!item.is_active?'selected':''}>Không</option></select>
    </div>`;
  }
  
  document.getElementById('modal-catalog-body').innerHTML = html;
  openModal('modal-catalog');
}

async function handleCatalogSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  if (data.is_active !== undefined) data.is_active = data.is_active === 'true';
  
  try {
    if (_catEditId) await API.updateCatalog(_currentCatalog, _catEditId, data);
    else await API.createCatalog(_currentCatalog, data);
    
    closeModal('modal-catalog');
    loadCatalogData();
  } catch(err) { alert(err.message); }
}

async function deleteCatalogItem(id) {
  if (!confirm('Bạn có chắc muốn vô hiệu hóa mục này? Các chức năng đang sử dụng sẽ không bị ảnh hưởng, nhưng sẽ không thể chọn mới.')) return;
  try {
    await API.deleteCatalog(_currentCatalog, id);
    loadCatalogData();
  } catch(err) { alert(err.message); }
}
