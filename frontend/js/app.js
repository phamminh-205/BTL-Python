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

const UI_COLORS = {
  primary: '#b91c1c',
  primaryDark: '#991b1b',
  primaryLight: '#fee2e2',
  accent: '#facc15',
  text: '#1f2937',
  muted: '#64748b',
  soft: '#94a3b8',
  border: '#e5e7eb',
  surface: '#f8fafc',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#475569',
};

const STATUS_COLOR = {
  DRAFT: UI_COLORS.muted,
  SUBMITTED: UI_COLORS.primary,
  VALIDATED: UI_COLORS.primaryDark,
  UNDER_REVIEW: UI_COLORS.info,
  REVIEWED: UI_COLORS.warning,
  APPROVED: UI_COLORS.success,
  ACCEPTED: UI_COLORS.success,
  IN_PROGRESS: UI_COLORS.success,
  REJECTED: UI_COLORS.danger,
  FAILED: UI_COLORS.danger,
  ACCEPTANCE_FAILED: UI_COLORS.danger,
  REVISION_REQUESTED: UI_COLORS.warning,
  ACCEPTANCE_REVISION_REQUESTED: UI_COLORS.warning,
  ACCEPTANCE_SUBMITTED: UI_COLORS.primary,
  UNDER_ACCEPTANCE_REVIEW: UI_COLORS.info,
  SUBMITTED_PROGRESS: UI_COLORS.info,
  NEEDS_REVISION: UI_COLORS.warning,
  DELAYED: UI_COLORS.danger,
};

const VERDICT_COLOR = {
  excellent: UI_COLORS.success,
  good: UI_COLORS.primary,
  pass: UI_COLORS.success,
  fail: UI_COLORS.danger,
  revise_required: UI_COLORS.warning,
};

function getStatusColor(status) {
  return STATUS_COLOR[status] || UI_COLORS.info;
}

function getProgressColor(status) {
  return { SUBMITTED: UI_COLORS.info, ACCEPTED: UI_COLORS.success, NEEDS_REVISION: UI_COLORS.warning, DELAYED: UI_COLORS.danger }[status] || UI_COLORS.info;
}

function renderStatCard(value, label, icon, tone = 'primary', extraClass = '') {
  return `<div class="card stat-card stat-card-${tone} ${extraClass}">
    <div class="stat-icon">${icon}</div>
    <div class="stat-content">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  </div>`;
}

function renderPagination(totalItems, currentPage, onPageChange) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) return '';
  let html = '<div class="pagination">';
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
    add('progress-staff', '📊 Theo dõi tiến độ');
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
  let extraHtml = '';

  if (user.role === 'FACULTY') {
    try {
      const [stats, prog] = await Promise.all([
        API.get('/proposals/stats/faculty').catch(() => ({ stats: {} })),
        API.get('/progress/dashboard/faculty').catch(() => ({ total_active_projects: 0, items: [] })),
      ]);
      const s = stats.stats || {};
      const overdue = (prog.items || []).filter(i => i.is_overdue);
      const upcoming = (prog.items || []).filter(i => !i.is_overdue && i.next_deadline);
      extraHtml = `
        <h4 class="section-title">📊 Thống kê đề tài</h4>
        <div class="stats-grid">
          ${renderStatCard(s['DRAFT'] || 0, 'Bản nháp', 'BN', 'info')}
          ${renderStatCard(s['SUBMITTED'] || 0, 'Đã nộp', 'N', 'primary')}
          ${renderStatCard(s['REVISION_REQUESTED'] || 0, 'Cần sửa', 'CS', 'warning')}
          ${renderStatCard(s['APPROVED'] || 0, 'Đã duyệt', 'D', 'success')}
          ${renderStatCard(s['IN_PROGRESS'] || 0, 'Đang thực hiện', 'TH', 'success', s['IN_PROGRESS'] > 0 ? 'surface-success' : '')}
        </div>
        ${overdue.length ? `
          <div class="card alert-card accent-left-danger mt-3">
            <h4>⚠️ Cảnh báo: ${overdue.length} đề tài chậm tiến độ</h4>
            <div class="metric-list">
              ${overdue.map(i => `<div class="metric-list-item"><b>${i.proposal_title}</b><span>${i.latest_completion_pct}% hoàn thành</span></div>`).join('')}
            </div>
          </div>` : ''}
        ${upcoming.length ? `
          <div class="card deadline-card accent-left mt-3">
            <h4>📅 Deadline báo cáo tiến độ sắp tới</h4>
            <div class="metric-list">
              ${upcoming.map(i => `<div class="metric-list-item"><b>${i.proposal_title}</b><span>Hạn: ${fmtDate(i.next_deadline)}</span></div>`).join('')}
            </div>
          </div>` : ''}`;
    } catch (e) { console.error('Dashboard error', e); }
  }

  if (user.role === 'STAFF' || user.role === 'LEADERSHIP' || user.role === 'ADMIN') {
    try {
      const [prog, acc] = await Promise.all([
        API.get('/progress/dashboard/staff').catch(() => null),
        API.get('/acceptance/dashboard/stats').catch(() => null)
      ]);
      
      if (prog) {
        const sb = prog.status_breakdown || {};
        extraHtml += `
          <h4 class="section-title">📊 Tổng quan tiến độ đề tài</h4>
          <div class="stats-grid">
            ${renderStatCard(prog.total_in_progress, 'Đang thực hiện', 'TH', 'success')}
            ${renderStatCard(prog.total_approved_not_started, 'Đã duyệt (chưa bắt đầu)', 'D', 'primary')}
            ${renderStatCard(prog.total_overdue_reports, 'Báo cáo quá hạn', 'QH', 'danger', prog.total_overdue_reports > 0 ? 'surface-danger' : '')}
            ${renderStatCard(prog.pending_review_count, 'Chờ review', 'RV', 'warning', prog.pending_review_count > 0 ? 'surface-warning' : '')}
          </div>
          <h4 class="section-title">Phân loại trạng thái báo cáo</h4>
          <div class="stats-grid">
            ${renderStatCard(sb.SUBMITTED || 0, 'Đã nộp', 'N', 'info')}
            ${renderStatCard(sb.ACCEPTED || 0, 'Chấp nhận', 'OK', 'success', 'surface-success')}
            ${renderStatCard(sb.NEEDS_REVISION || 0, 'Cần bổ sung', 'BS', 'warning', 'surface-warning')}
            ${renderStatCard(sb.DELAYED || 0, 'Chậm tiến độ', 'CT', 'danger', 'surface-danger')}
          </div>`;
      }
      
      if (acc) {
        const byS = acc.by_status || {};
        extraHtml += `
          <h4 class="section-title">🎓 Thống kê Nghiệm thu</h4>
          <div class="stats-grid">
            ${renderStatCard(acc.total || 0, 'Tổng hồ sơ', 'HS', 'info', 'surface-info')}
            ${renderStatCard(acc.pending_submission || 0, 'Chờ KHCN duyệt', 'KD', 'primary')}
            ${renderStatCard(acc.under_review || 0, 'Đang phản biện', 'PB', 'info', acc.under_review > 0 ? 'surface-info' : '')}
            ${renderStatCard(byS.REVIEWED || 0, 'Chờ LĐ xác nhận', 'LD', 'warning', byS.REVIEWED > 0 ? 'surface-warning' : '')}
            ${renderStatCard(acc.finalized || 0, 'Đã chốt kết quả', 'CK', 'success', 'surface-success')}
          </div>`;
      }
    } catch (e) { console.error('Staff dashboard error', e); }
  }

  el.innerHTML = `<div class="card"><h3>Chào mừng, ${user.full_name}!</h3>
    <p>Vai trò: <strong>${user.role}</strong> | Email: ${user.email}</p>
    <p>Sử dụng menu bên trái để điều hướng.</p></div>${extraHtml}`;
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
  } catch (e) { document.getElementById('proposals-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoMyPropPage(p) { _myPropPage = p; loadMyProposals(); }

async function submitProposal(id) {
  if (!confirm('Xác nhận nộp đề tài này?')) return;
  try {
    await API.post(`/proposals/${id}/submit`);
    showMsg(document.getElementById('msg-proposals'), 'Nộp thành công!', 'success');
    await loadMyProposals();
  } catch (e) { showMsg(document.getElementById('msg-proposals'), e.message); }
}

async function viewProposal(id) {
  try {
    const p = await API.get(`/proposals/${id}`);
    const reviews = await API.get(`/reviews/proposal/${id}`).catch(() => null);
    const history = await API.get(`/proposals/${id}/history`).catch(() => []);

    let reviewHtml = '';
    if (reviews && reviews.length) {
      reviewHtml = `<h4 class="section-title">📊 Đánh giá từ hội đồng phản biện</h4>
        ${reviews.map(r => `
          <div class="card review-card">
            <div class="review-head">
              <span class="strong">${r.reviewer_name || 'Phản biện'}</span>
              <span class="badge ${r.verdict === 'PASS' ? 'badge-success' : (r.verdict === 'FAIL' ? 'badge-danger' : 'badge-warning')}">${r.verdict}</span>
            </div>
            <p class="review-score">${r.score} điểm</p>
            ${r.criteria_scores ? `
              <div class="info-box text-small mb-2">
                ${r.criteria_scores.map(cs => `<div class="split-row"><span>Tiêu chí ${cs.id}:</span> <span>${cs.score}</span></div>`).join('')}
              </div>` : ''}
            <p class="italic body-small text-muted">"${r.comments}"</p>
          </div>
        `).join('')}`;
    }

    const timelineHtml = history.map((h, i) => `
      <div class="timeline-item-simple">
        <div class="timeline-dot-simple"></div>
        ${i < history.length - 1 ? '<div class="timeline-line-simple"></div>' : ''}
        <div class="timeline-content w-full">
          <div class="split-row body-small">
            <span class="strong">${h.to_status}</span>
            <span class="text-muted">${fmtDate(h.changed_at)}</span>
          </div>
          <div class="text-muted text-small">${h.action} ${h.note ? `— <span class="badge badge-danger">${h.note}</span>` : ''}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('modal-view-body').innerHTML = `
      <div class="detail-grid">
        <div>
          <p><b>Trạng thái:</b> ${badge(p.status)}</p>
          <p><b>PI:</b> ${p.pi_name}</p>
          <p><b>Lĩnh vực:</b> ${p.field_name || '—'}</p>
          <p><b>Loại:</b> ${p.category_name || '—'}</p>
          <p><b>Thời gian:</b> ${p.duration_months || '—'} tháng</p>
          <p><b>Tài liệu:</b> ${p.attachment_url ? `<a href="${p.attachment_url}" target="_blank">🔗 Xem hồ sơ</a>` : '—'}</p>
          <div class="info-box mt-3">
            <p class="strong body-small mb-2">Tóm tắt:</p>
            <p class="body-small">${p.summary || 'Chưa có tóm tắt.'}</p>
          </div>
        </div>
        <div>
          <h4 class="mb-3">🕒 Lịch sử phê duyệt</h4>
          <div>${timelineHtml}</div>
        </div>
      </div>
      ${reviewHtml}
    `;
    document.getElementById('modal-view-title').textContent = p.title;
    openModal('modal-view');
  } catch (e) { alert(e.message); }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — CREATE PROPOSAL
// ══════════════════════════════════════════════════════════════════
registerPage('create-proposal', async () => {
  const el = document.getElementById('page-create-proposal');
  try {
    const [fields, categories, periods] = await Promise.all([
      API.get('/catalog/research-fields'),
      API.get('/catalog/proposal-categories'),
      API.get('/periods?status=OPEN'),
    ]);

    el.innerHTML = `<div class="section-header"><h2>Tạo đề tài mới</h2></div>
      <div id="msg-create"></div>
      <div class="card">
        <form id="create-form">
          <div class="form-group"><label>Tên đề tài *</label><input name="title" required></div>
          <div class="form-row">
            <div class="form-group"><label>Đợt đăng ký *</label><select name="period_id">
              ${(periods.items || []).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Lĩnh vực *</label><select name="field_id">
              <option value="">— Chọn —</option>
              ${(fields.items || []).map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select></div>
          </div>
        <div class="form-row">
          <div class="form-group"><label>Loại đề tài</label><select name="category_id">
            <option value="">— Chọn —</option>
            ${(categories.items || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>Thời gian (tháng) *</label><input name="duration_months" type="number" min="1" max="36"></div>
        </div>
        <div class="form-group"><label>Tài liệu đính kèm (URL)</label><input name="attachment_url" placeholder="https://..."></div>
        <div class="form-group"><label>Tóm tắt</label><textarea name="summary" rows="3"></textarea></div>
        <div class="form-group"><label>Mục tiêu</label><textarea name="objectives" rows="3"></textarea></div>
        <div class="form-group"><label>Phương pháp</label><textarea name="methodology" rows="3"></textarea></div>
        <div class="form-group"><label>Kết quả dự kiến</label><textarea name="expected_outcomes" rows="2"></textarea></div>
        <div class="action-row mt-3">
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
      } catch (err) { showMsg(document.getElementById('msg-create'), err.message); }
    });
  } catch (e) {
    el.innerHTML = `<p class="alert alert-error">Lỗi khi tải trang: ${e.message}</p>`;
  }
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
    periodSel.innerHTML = `<option value="">— Chọn —</option>` + periods.map(x => `<option value="${x.id}" ${p.period_id === x.id ? 'selected' : ''}>${x.title}</option>`).join('');

    const fieldSel = document.getElementById('edit-prop-field');
    fieldSel.innerHTML = `<option value="">— Chọn —</option>` + (fields.items || []).map(x => `<option value="${x.id}" ${p.field_id === x.id ? 'selected' : ''}>${x.name}</option>`).join('');

    const catSel = document.getElementById('edit-prop-category');
    catSel.innerHTML = `<option value="">— Chọn —</option>` + (categories.items || []).map(x => `<option value="${x.id}" ${p.category_id === x.id ? 'selected' : ''}>${x.name}</option>`).join('');

    openModal('modal-edit-proposal');
  } catch (e) { alert(e.message); }
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
    } catch (err) { showMsg(document.getElementById('msg-edit-proposal'), err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — PROGRESS REPORT
// ══════════════════════════════════════════════════════════════════
registerPage('progress', async () => {
  const el = document.getElementById('page-progress');
  // Load both APPROVED and IN_PROGRESS proposals
  const [inProg, approved] = await Promise.all([
    API.get('/proposals?status=IN_PROGRESS&size=50').catch(() => ({ items: [] })),
    API.get('/proposals?status=APPROVED&size=50').catch(() => ({ items: [] })),
  ]);
  const allProposals = [...inProg.items, ...approved.items];

  el.innerHTML = `<div class="section-header"><h2>📊 Báo cáo tiến độ</h2></div>
    <div id="msg-progress"></div>
    <div class="card">
      <div class="form-group">
        <label for="sel-progress-proposal">Chọn đề tài (đã phê duyệt / đang thực hiện):</label>
        <select id="sel-progress-proposal" onchange="loadProgressReports()">
          <option value="">— Chọn đề tài —</option>
          ${allProposals.map(p => `<option value="${p.id}">[${p.status}] ${p.title}</option>`).join('')}
        </select>
      </div>
      <div class="action-row mb-3">
        <button id="tab-reports" class="btn btn-primary btn-sm" onclick="switchProgressTab('reports')">📋 Danh sách báo cáo</button>
        <button id="tab-submit" class="btn btn-secondary btn-sm" onclick="switchProgressTab('submit')">➕ Nộp báo cáo mới</button>
        <button id="tab-timeline" class="btn btn-secondary btn-sm" onclick="switchProgressTab('timeline')">🕒 Timeline dự án</button>
      </div>
    </div>
    <div id="tab-content-reports" class="card" style="display:none">
      <div id="progress-list"><p class="empty">Chọn đề tài để xem báo cáo.</p></div>
    </div>
    <div id="tab-content-submit" class="card" style="display:none">
      <h4>Nộp báo cáo tiến độ mới</h4>
      <form id="form-progress">
        <div class="form-row">
          <div class="form-group">
            <label for="prog-period">Kỳ báo cáo</label>
            <input id="prog-period" name="report_period" placeholder="VD: Tháng 3-4/2026">
          </div>
          <div class="form-group">
            <label for="prog-pct">Phần trăm hoàn thành (%) *</label>
            <input id="prog-pct" name="completion_pct" type="number" min="0" max="100" required>
          </div>
        </div>
        <div class="form-group">
          <label for="prog-content">Công việc đã hoàn thành *</label>
          <textarea id="prog-content" name="content" rows="4" placeholder="Mô tả chi tiết công việc đã thực hiện trong kỳ này..." required></textarea>
        </div>
        <div class="form-group">
          <label for="prog-products">Sản phẩm đã tạo ra</label>
          <textarea id="prog-products" name="products_created" rows="2" placeholder="VD: Bài báo, phần mềm, báo cáo trung gian..."></textarea>
        </div>
        <div class="form-group">
          <label for="prog-issues">Khó khăn / Rủi ro</label>
          <textarea id="prog-issues" name="issues" rows="2" placeholder="Các vấn đề phát sinh, rủi ro cần chú ý..."></textarea>
        </div>
        <div class="form-group">
          <label for="prog-nextsteps">Kế hoạch tiếp theo *</label>
          <textarea id="prog-nextsteps" name="next_steps" rows="2" placeholder="Công việc dự kiến trong kỳ tới..." required></textarea>
        </div>
        <div class="form-group">
          <label for="prog-attachment">Minh chứng đính kèm (URL)</label>
          <input id="prog-attachment" name="attachment_url" placeholder="https://drive.google.com/...">
        </div>
        <button type="submit" class="btn btn-primary">📤 Nộp báo cáo</button>
      </form>
    </div>
    <div id="tab-content-timeline" class="card" style="display:none">
      <div id="progress-timeline"><p class="empty">Chọn đề tài để xem timeline.</p></div>
    </div>`;

  document.getElementById('form-progress').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pid = document.getElementById('sel-progress-proposal').value;
    if (!pid) return alert('Vui lòng chọn đề tài');
    const fd = new FormData(e.target);
    try {
      await API.post(`/progress/proposals/${pid}`, {
        report_period: fd.get('report_period') || null,
        content: fd.get('content'),
        products_created: fd.get('products_created') || null,
        completion_pct: parseFloat(fd.get('completion_pct')),
        issues: fd.get('issues') || null,
        next_steps: fd.get('next_steps'),
        attachment_url: fd.get('attachment_url') || null,
      });
      showMsg(document.getElementById('msg-progress'), 'Nộp báo cáo thành công!', 'success');
      e.target.reset();
      await loadProgressReports();
      switchProgressTab('reports');
    } catch (err) { showMsg(document.getElementById('msg-progress'), err.message); }
  });
});



function switchProgressTab(tab) {
  ['reports', 'submit', 'timeline'].forEach(t => {
    const content = document.getElementById(`tab-content-${t}`);
    const btn = document.getElementById(`tab-${t}`);
    if (content) content.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.className = `btn btn-sm ${t === tab ? 'btn-primary' : 'btn-secondary'}`;
    }
  });
  const pid = document.getElementById('sel-progress-proposal')?.value;
  if (tab === 'reports' && pid) loadProgressReports();
  if (tab === 'timeline' && pid) loadProgressTimeline(pid);
}

async function loadProgressReports() {
  const pid = document.getElementById('sel-progress-proposal').value;
  const listEl = document.getElementById('progress-list');
  if (!pid) { listEl.innerHTML = '<p class="empty">Chọn đề tài để xem báo cáo.</p>'; return; }
  const tabEl = document.getElementById('tab-content-reports');
  if (tabEl) tabEl.style.display = 'block';
  try {
    const reports = await API.get(`/progress/proposals/${pid}`);
    if (!reports.length) { listEl.innerHTML = '<p class="empty">Chưa có báo cáo nào.</p>'; return; }

    const statusLabel = { SUBMITTED: 'Đã nộp', ACCEPTED: 'Chấp nhận', NEEDS_REVISION: 'Cần bổ sung', DELAYED: 'Chậm tiến độ' };

    listEl.innerHTML = reports.map(r => `
      <div class="card dynamic-accent" style="--item-color:${getProgressColor(r.status)}">
        <div class="split-row">
          <div>
            <span class="strong">Báo cáo #${r.report_order}</span>
            ${r.report_period ? `<span class="text-muted mt-1">${r.report_period}</span>` : ''}
            ${r.is_overdue ? '<span class="badge badge-danger">⚠️ Quá hạn</span>' : ''}
          </div>
          <div class="inline-actions">
            <span class="metric-value" style="color:${getProgressColor(r.status)}">${r.completion_pct}%</span>
            <span class="badge" style="color:${getProgressColor(r.status)};border-color:${getProgressColor(r.status)}">${statusLabel[r.status] || r.status}</span>
          </div>
        </div>
        <div class="body-small mt-2">
          <p><b>Công việc đã hoàn thành:</b> ${r.content}</p>
          ${r.products_created ? `<p><b>Sản phẩm:</b> ${r.products_created}</p>` : ''}
          ${r.issues ? `<p><b>Khó khăn:</b> ${r.issues}</p>` : ''}
          <p><b>Kế hoạch tiếp theo:</b> ${r.next_steps}</p>
          ${r.attachment_url ? `<p><b>Minh chứng:</b> <a href="${r.attachment_url}" target="_blank">🔗 Xem tài liệu</a></p>` : ''}
        </div>
        ${r.review_note ? `
          <div class="info-box text-small mt-2">
            <b>Nhận xét Phòng KHCN:</b> ${r.review_note}
            ${r.reviewed_at ? `<span class="text-muted">(${fmtDate(r.reviewed_at)})</span>` : ''}
          </div>` : ''}
        <div class="text-muted text-small mt-2">Nộp: ${fmtDate(r.submitted_at)}</div>
      </div>`).join('');
  } catch (e) { listEl.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

async function loadProgressTimeline(pid) {
  const el = document.getElementById('progress-timeline');
  if (!pid) { el.innerHTML = '<p class="empty">Chọn đề tài để xem timeline.</p>'; return; }
  try {
    const tl = await API.get(`/progress/proposals/${pid}/timeline`);
    const latestPct = tl.latest_completion_pct || 0;

    // Progress bar
    let html = `
      <div class="mb-3">
        <div class="split-row mb-2">
          <span class="strong">${tl.proposal_title}</span>
          <span class="strong" style="color:${latestPct >= 100 ? UI_COLORS.success : latestPct >= 50 ? UI_COLORS.primary : UI_COLORS.warning}">${latestPct}% hoàn thành</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="--progress-value:${latestPct}%;--progress-color:${latestPct >= 100 ? UI_COLORS.success : latestPct >= 50 ? UI_COLORS.primary : UI_COLORS.warning}"></div>
        </div>
        <div class="split-row text-muted text-small mt-1">
          <span>PI: ${tl.pi_name || '—'}</span>
          <span>Thời gian: ${tl.duration_months || '—'} tháng</span>
          <span>Báo cáo: ${tl.total_reports} kỳ</span>
        </div>
      </div>`;

    // Combined timeline
    const events = [];
    (tl.status_history || []).forEach(h => events.push({ ...h, _type: 'status', _date: h.changed_at }));
    (tl.progress_reports || []).forEach(r => events.push({ ...r, _type: 'report', _date: r.submitted_at }));
    events.sort((a, b) => new Date(a._date) - new Date(b._date));

    html += '<div class="timeline">';
    events.forEach((ev, i) => {
      const isLast = i === events.length - 1;
      if (ev._type === 'status') {
        html += `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            ${!isLast ? '<div class="timeline-line"></div>' : ''}
            <div class="timeline-content">
              <span class="strong">${ev.to_status}</span>
              <span class="text-muted text-small">${fmtDate(ev._date)}</span>
              <div class="text-muted text-small">${ev.action}${ev.note ? ` — <span class="badge badge-danger">${ev.note}</span>` : ''}</div>
            </div>
          </div>`;
      } else {
        const color = getProgressColor(ev.status);
        html += `
          <div class="timeline-item">
            <div class="timeline-dot" style="--timeline-color:${color}"></div>
            ${!isLast ? '<div class="timeline-line"></div>' : ''}
            <div class="timeline-card">
              <div class="split-row">
                <span class="strong">📊 Báo cáo kỳ #${ev.report_order}${ev.report_period ? ` — ${ev.report_period}` : ''}</span>
                <span class="strong" style="color:${color}">${ev.completion_pct}%</span>
              </div>
              <div class="text-muted text-small mt-1">${fmtDate(ev._date)}
                ${ev.is_overdue ? '<span class="badge badge-danger">⚠️ Quá hạn</span>' : ''}
              </div>
            </div>
          </div>`;
      }
    });
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}


// ══════════════════════════════════════════════════════════════════
// PAGE: FACULTY — ACCEPTANCE (NGHIỆM THU)
// ══════════════════════════════════════════════════════════════════
registerPage('acceptance', async () => {
  const el = document.getElementById('page-acceptance');
  el.innerHTML = `
    <div class="section-header"><h2>✅ Nghiệm thu đề tài</h2>
      <div class="section-actions">
        <button class="btn btn-primary" id="acc-tab-btn-list" onclick="switchAccTab('list')">📋 Danh sách hồ sơ</button>
        <button class="btn btn-secondary" id="acc-tab-btn-new" onclick="switchAccTab('new')">➕ Tạo hồ sơ mới</button>
      </div></div>
    <div id="msg-acceptance"></div>
    <div id="acc-tab-list-content"><p class="empty">Đang tải...</p></div>
    <div id="acc-tab-new-content" style="display:none"></div>`;
  await loadAcceptanceList();
  await renderAcceptanceNewForm();
});

function switchAccTab(tab) {
  document.getElementById('acc-tab-list-content').style.display = tab === 'list' ? 'block' : 'none';
  document.getElementById('acc-tab-new-content').style.display = tab === 'new' ? 'block' : 'none';
  document.getElementById('acc-tab-btn-list').className = `btn ${tab === 'list' ? 'btn-primary' : 'btn-secondary'}`;
  document.getElementById('acc-tab-btn-new').className = `btn ${tab === 'new' ? 'btn-primary' : 'btn-secondary'}`;
}

async function loadAcceptanceList() {
  const el = document.getElementById('acc-tab-list-content');
  try {
    const data = await API.get('/acceptance/my');
    if (!data.items || !data.items.length) { el.innerHTML = '<p class="empty">Chưa có hồ sơ nghiệm thu. Hãy tạo hồ sơ mới.</p>'; return; }
    const vLabel = { excellent: '🏆 Xuất sắc', good: '🥇 Tốt', pass: '✅ Đạt', fail: '❌ Không đạt', revise_required: '📝 Cần bổ sung' };
    el.innerHTML = data.items.map(d => `
      <div class="card dynamic-accent" style="--item-color:${getStatusColor(d.status)}">
        <div class="split-row">
          <div>
            <div class="strong">${d.proposal_title || d.proposal_id}</div>
            <div class="inline-actions mt-1">
              ${badge(d.status)}
              ${d.final_verdict ? `<span class="badge" style="color:${VERDICT_COLOR[d.final_verdict] || UI_COLORS.info};border-color:${VERDICT_COLOR[d.final_verdict] || UI_COLORS.info}">${vLabel[d.final_verdict] || d.final_verdict}</span>` : ''}
              ${d.revision_reason ? `<span class="badge badge-warning">⚠️ ${d.revision_reason}</span>` : ''}
            </div>
          </div>
          <div class="inline-actions">
            <button class="btn btn-sm btn-secondary" onclick="viewAccDossier('${d.id}')">🔍 Chi tiết</button>
            ${(d.status === 'DRAFT' || d.status === 'REVISION_REQUESTED') ? `
              <button class="btn btn-sm btn-warning" onclick="editAccDossier('${d.id}')">✏️ Sửa</button>
              <button class="btn btn-sm btn-primary" onclick="submitAccDossier('${d.id}')">📤 Nộp</button>` : ''}
          </div>
        </div>
        <div class="body-small text-muted mt-2">
          <b>Báo cáo:</b> ${d.final_report.substring(0, 120)}${d.final_report.length > 120 ? '...' : ''}
        </div>
        <div class="text-muted text-small mt-1">
          Tạo: ${fmtDate(d.created_at)}${d.submitted_at ? ` | Nộp: ${fmtDate(d.submitted_at)}` : ''}${d.finalized_at ? ` | Kết quả: ${fmtDate(d.finalized_at)}` : ''}        </div>
      </div>`).join('');
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

async function renderAcceptanceNewForm() {
  const el = document.getElementById('acc-tab-new-content');
  try {
    const [ip, comp, rev] = await Promise.all([
      API.get('/proposals?status=IN_PROGRESS&size=50').catch(() => ({ items: [] })),
      API.get('/proposals?status=COMPLETED&size=50').catch(() => ({ items: [] })),
      API.get('/proposals?status=ACCEPTANCE_REVISION_REQUESTED&size=50').catch(() => ({ items: [] })),
    ]);
    const proposals = [...ip.items, ...comp.items, ...rev.items];
    window._accAttachments = [];
    window._accPubIds = [];
    el.innerHTML = `
      <div class="card">
        <h3>📝 Tạo hồ sơ nghiệm thu mới</h3>
        <div class="form-group"><label for="acc-sel-proposal">Chọn đề tài *</label>
          <select id="acc-sel-proposal" onchange="loadAccLinkedPubs()">
            <option value="">— Chọn đề tài —</option>
            ${proposals.map(p => `<option value="${p.id}">${p.title} (${p.status})</option>`).join('')}
          </select></div>
        <form id="form-acc-create">
          <div class="form-group"><label>Báo cáo tổng kết *</label><textarea id="acc-final-report" rows="5" required placeholder="Tóm tắt toàn bộ quá trình và kết quả..."></textarea></div>
          <div class="form-group"><label>Sản phẩm đạt được *</label><textarea id="acc-achievements" rows="3" required placeholder="Liệt kê các sản phẩm nghiên cứu..."></textarea></div>
          <div class="form-group"><label>Mô tả sản phẩm cụ thể</label><textarea id="acc-deliverables" rows="2" placeholder="Phần mềm, mô hình, bài báo..."></textarea></div>
          <div class="form-group"><label>Tóm tắt ứng dụng / tác động</label><textarea id="acc-impact" rows="2" placeholder="Ứng dụng thực tiễn, đóng góp khoa học..."></textarea></div>
          <div class="form-group"><label>Tự đánh giá</label><textarea id="acc-self" rows="2" placeholder="Tự đánh giá mức độ hoàn thành mục tiêu..."></textarea></div>
          <div class="form-group"><label>Giải trình hoàn thành so với mục tiêu ban đầu</label><textarea id="acc-explain" rows="3" placeholder="Giải trình điểm chưa đạt (nếu có)..."></textarea></div>
          <div class="form-group"><label>Publication liên kết</label>
            <div id="acc-pub-list" class="info-box body-small text-muted">Chọn đề tài để xem...</div></div>
          <div class="form-group"><label>Minh chứng (nhập URL rồi Enter)</label>
            <input id="acc-attachment" placeholder="https://...">
            <div id="acc-att-tags" class="tag-list"></div></div>
          <div class="action-row mt-3">
            <button type="button" class="btn btn-secondary" onclick="saveAccDraft()">💾 Lưu nháp</button>
            <button type="button" class="btn btn-primary" onclick="saveAndSubmitAcc()">📤 Lưu &amp; Nộp</button>
          </div>
        </form>
      </div>`;
    document.getElementById('acc-attachment').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const url = e.target.value.trim();
      if (!url) return;
      window._accAttachments.push({ name: url.split('/').pop().substring(0, 40), url, uploaded_at: new Date().toISOString() });
      e.target.value = '';
      renderAccAttTags();
    });
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function renderAccAttTags() {
  document.getElementById('acc-att-tags').innerHTML = (window._accAttachments || []).map((a, i) =>
    `<span class="chip">🔗 ${a.name}
      <button onclick="window._accAttachments.splice(${i},1);renderAccAttTags()">×</button></span>`).join('');
}

async function loadAccLinkedPubs() {
  const pid = document.getElementById('acc-sel-proposal')?.value;
  const el = document.getElementById('acc-pub-list');
  if (!pid) { el.innerHTML = 'Chọn đề tài để xem...'; return; }
  window._accPubIds = [];
  try {
    const pubs = await API.get(`/acceptance/proposals/${pid}/publications`).catch(() => []);
    if (!pubs.length) { el.innerHTML = '<span class="text-muted">Chưa có publication nào.</span>'; return; }
    el.innerHTML = pubs.map(p =>
      `<label class="check-row">
        <input type="checkbox" class="acc-pub-cb" value="${p.id}" onchange="updateAccPubIds()">
        <span><b>${p.title}</b> — ${p.journal_name || ''} <span class="badge badge-submitted">${p.pub_type}</span></span></label>`).join('');
  } catch (e) { el.innerHTML = `<span class="badge badge-danger">${e.message}</span>`; }
}

function updateAccPubIds() {
  window._accPubIds = [...document.querySelectorAll('.acc-pub-cb:checked')].map(cb => cb.value);
}

function getAccFormBody() {
  return {
    final_report: document.getElementById('acc-final-report').value,
    achievements: document.getElementById('acc-achievements').value,
    deliverables: document.getElementById('acc-deliverables').value || null,
    impact_summary: document.getElementById('acc-impact').value || null,
    self_assessment: document.getElementById('acc-self').value || null,
    completion_explanation: document.getElementById('acc-explain').value || null,
    linked_publication_ids: window._accPubIds || [],
    attachments_metadata: window._accAttachments || [],
  };
}

async function saveAccDraft() {
  const pid = document.getElementById('acc-sel-proposal')?.value;
  if (!pid) return alert('Vui lòng chọn đề tài');
  const body = getAccFormBody();
  if (!body.final_report || body.final_report.length < 50) return alert('Báo cáo tổng kết tối thiểu 50 ký tự');
  try {
    await API.post(`/acceptance/proposals/${pid}`, body);
    showMsg(document.getElementById('msg-acceptance'), '✅ Đã lưu hồ sơ nháp!', 'success');
    switchAccTab('list'); await loadAcceptanceList();
  } catch (err) { showMsg(document.getElementById('msg-acceptance'), err.message); }
}

async function saveAndSubmitAcc() {
  const pid = document.getElementById('acc-sel-proposal')?.value;
  if (!pid) return alert('Vui lòng chọn đề tài');
  const body = getAccFormBody();
  if (!body.final_report || body.final_report.length < 50) return alert('Báo cáo tổng kết tối thiểu 50 ký tự');
  if (!body.achievements || body.achievements.length < 20) return alert('Sản phẩm đạt được tối thiểu 20 ký tự');
  try {
    const d = await API.post(`/acceptance/proposals/${pid}`, body);
    await API.post(`/acceptance/${d.id}/submit`);
    showMsg(document.getElementById('msg-acceptance'), '🎉 Đã nộp hồ sơ nghiệm thu!', 'success');
    switchAccTab('list'); await loadAcceptanceList();
  } catch (err) { showMsg(document.getElementById('msg-acceptance'), err.message); }
}

async function submitAccDossier(dossierId) {
  if (!confirm('Xác nhận nộp hồ sơ nghiệm thu?')) return;
  try {
    await API.post(`/acceptance/${dossierId}/submit`);
    showMsg(document.getElementById('msg-acceptance'), '🎉 Đã nộp hồ sơ!', 'success');
    await loadAcceptanceList();
  } catch (e) { showMsg(document.getElementById('msg-acceptance'), e.message); }
}

async function editAccDossier(dossierId) {
  try {
    const d = await API.get(`/acceptance/${dossierId}`);
    switchAccTab('new');
    await renderAcceptanceNewForm();
    setTimeout(async () => {
      const sel = document.getElementById('acc-sel-proposal');
      if (sel && d.proposal_id) { sel.value = d.proposal_id; await loadAccLinkedPubs(); }
      document.getElementById('acc-final-report').value = d.final_report || '';
      document.getElementById('acc-achievements').value = d.achievements || '';
      document.getElementById('acc-deliverables').value = d.deliverables || '';
      document.getElementById('acc-impact').value = d.impact_summary || '';
      document.getElementById('acc-self').value = d.self_assessment || '';
      document.getElementById('acc-explain').value = d.completion_explanation || '';
      window._accAttachments = d.attachments_metadata || []; renderAccAttTags();
      const btnDraft = document.querySelector('#acc-tab-new-content .btn.btn-secondary');
      const btnSubmit = document.querySelector('#acc-tab-new-content .btn.btn-primary');
      if (btnDraft) btnDraft.onclick = async () => { try { await API.put(`/acceptance/${dossierId}`, getAccFormBody()); showMsg(document.getElementById('msg-acceptance'), '✅ Đã cập nhật!', 'success'); switchAccTab('list'); await loadAcceptanceList(); } catch (e) { showMsg(document.getElementById('msg-acceptance'), e.message); } };
      if (btnSubmit) btnSubmit.onclick = async () => { try { await API.put(`/acceptance/${dossierId}`, getAccFormBody()); await API.post(`/acceptance/${dossierId}/submit`); showMsg(document.getElementById('msg-acceptance'), '🎉 Đã nộp!', 'success'); switchAccTab('list'); await loadAcceptanceList(); } catch (e) { showMsg(document.getElementById('msg-acceptance'), e.message); } };
    }, 150);
  } catch (e) { alert(e.message); }
}

async function viewAccDossier(dossierId) {
  try {
    const d = await API.get(`/acceptance/${dossierId}`);
    const vLabel = { excellent: '🏆 Xuất sắc', good: '🥇 Tốt', pass: '✅ Đạt', fail: '❌ Không đạt', revise_required: '📝 Cần bổ sung' };
    const histHtml = (d.status_history || []).map((h, i, arr) => `
      <div class="timeline-item-simple">
        <div class="timeline-dot-simple"></div>
        ${i < arr.length - 1 ? '<div class="timeline-line-simple"></div>' : ''}
        <div class="timeline-content w-full">
          <div class="split-row text-small">
            <span class="strong">${h.from_status || '—'} → ${h.to_status}</span>
            <span class="text-muted">${fmtDate(h.changed_at)}</span>
          </div>
          <div class="text-muted text-small">${h.action}${h.note ? ` — <span class="badge badge-danger">${h.note}</span>` : ''}</div>
        </div>
      </div>`).join('');
    document.getElementById('modal-view-title').textContent = `Hồ sơ NT: ${d.proposal_title || d.proposal_id}`;
    document.getElementById('modal-view-body').innerHTML = `
      <div class="detail-grid">
        <div>
          <p><b>Trạng thái:</b> ${badge(d.status)}</p>
          ${d.final_verdict ? `<div class="info-box mt-2" style="border-color:${VERDICT_COLOR[d.final_verdict] || UI_COLORS.info}">
            <b>Kết quả:</b> <span class="strong" style="color:${VERDICT_COLOR[d.final_verdict] || UI_COLORS.info}">${vLabel[d.final_verdict]}</span>
            ${d.finalize_note ? `<p class="text-small mt-1">${d.finalize_note}</p>` : ''}</div>` : ''}
          ${d.revision_reason ? `<div class="info-box card-danger accent-left-danger body-small mb-2"><b>Lý do trả về:</b> ${d.revision_reason}</div>` : ''}
          <div class="body-small mt-2"><b>Báo cáo tổng kết:</b>
            <div class="text-box">${d.final_report}</div></div>
          <div class="body-small mt-2"><b>Sản phẩm đạt được:</b>
            <div class="text-box">${d.achievements}</div></div>
          ${d.impact_summary ? `<div class="body-small mt-2"><b>Ứng dụng:</b> ${d.impact_summary}</div>` : ''}
          ${d.self_assessment ? `<div class="body-small mt-2"><b>Tự đánh giá:</b> ${d.self_assessment}</div>` : ''}
          ${(d.attachments_metadata || []).length ? `<div class="mt-2"><b class="body-small">📎 Minh chứng:</b> ${d.attachments_metadata.map(a => `<a href="${a.url}" target="_blank" class="text-small">🔗 ${a.name}</a>`).join('')}</div>` : ''}
        </div>
        <div>
          <h4 class="mb-3">🕒 Lịch sử hồ sơ</h4>
          <div>${histHtml || '<p class="text-muted body-small">Chưa có lịch sử.</p>'}</div>
        </div>
      </div>`;
    openModal('modal-view');
  } catch (e) { alert(e.message); }
}




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
          <td>${p.title}</td><td>${p.pi_name}</td><td>${p.period_title || '—'}</td><td>${fmtDateShort(p.submitted_at)}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewProposal('${p.id}')">Xem</button>
            <button class="btn btn-sm btn-success" onclick="validateProposal('${p.id}','APPROVE')">✓ Hợp lệ</button>
            <button class="btn btn-sm btn-warning" onclick="openReturnModal('${p.id}')">↩ Trả về</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;

    html += renderPagination(data.total, _validatePage, 'gotoValidatePage');
    el.innerHTML = html;
  } catch (e) { document.getElementById('validate-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoValidatePage(p) { _validatePage = p; loadValidateList(); }

async function validateProposal(id, action, reason) {
  try {
    await API.post(`/proposals/${id}/validate`, { action, reason });
    showMsg(document.getElementById('msg-validate'), action === 'APPROVE' ? 'Đã xác nhận hợp lệ!' : 'Đã trả về cho giảng viên!', 'success');
    await loadValidateList();
  } catch (e) { showMsg(document.getElementById('msg-validate'), e.message); }
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
  } catch (e) { document.getElementById('periods-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoPeriodPage(p) { _periodPage = p; loadPeriods(); }

async function periodAction(id, action) {
  try {
    await API.post(`/periods/${id}/${action}`);
    showMsg(document.getElementById('msg-periods'), 'Cập nhật thành công!', 'success');
    await loadPeriods();
  } catch (e) { showMsg(document.getElementById('msg-periods'), e.message); }
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
    } catch (err) { alert(err.message); }
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
    } catch (err) { showMsg(document.getElementById('msg-councils'), err.message); }
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

    el.innerHTML = `<div class="card mt-3">
      <table><thead><tr><th>Tên hội đồng</th><th>Đề tài</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  } catch (e) { document.getElementById('councils-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
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
  } catch (e) { alert(e.message); }
}

async function manageCouncil(councilId) {
  try {
    const c = await API.get(`/councils/${councilId}`);
    const reviewers = await API.get('/users?role=REVIEWER&size=100');

    document.getElementById('modal-council-title').textContent = `Thiết lập: ${c.name}`;
    document.getElementById('council-proposal-id').value = councilId; // Using this as councilId now

    const currentMemberIds = c.members.map(m => m.user_id);
    document.getElementById('council-reviewer-list').innerHTML = reviewers.items.map(r => `
      <label class="reviewer-option">
        <input type="checkbox" value="${r.id}" ${currentMemberIds.includes(r.id) ? 'checked' : ''}> 
        ${r.full_name} (${r.academic_rank || ''} ${r.academic_title || ''})
      </label>
    `).join('');

    openModal('modal-council-manage');
  } catch (e) { alert(e.message); }
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
    } catch (e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — ACCEPTANCE STAFF
// ══════════════════════════════════════════════════════════════════
let _accStaffPage = 1;
let _accStaffStatus = '';

registerPage('acceptance-staff', async () => {
  const el = document.getElementById('page-acceptance-staff');
  _accStaffPage = 1; _accStaffStatus = '';
  el.innerHTML = `
    <div class="section-header"><h2>📋 Quản lý Nghiệm thu — Phòng KHCN</h2></div>
    <div id="msg-acc-staff"></div>
    <div class="card filter-panel">
      <div class="filter-row">
        <span class="filter-label">Lọc:</span>
        ${['', 'SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'ACCEPTED', 'FAILED', 'REVISION_REQUESTED'].map(s =>
    `<button class="btn btn-sm ${s === '' ? 'btn-primary' : 'btn-secondary'}" id="accf-${s || 'ALL'}" onclick="filterAccStaff('${s}')">
            ${s === '' ? 'Tất cả' : s}</button>`).join('')}
      </div>
    </div>
    <div id="acc-staff-list">Đang tải...</div>`;
  await loadAccStaff();
});

async function filterAccStaff(status) {
  _accStaffStatus = status; _accStaffPage = 1;
  ['', 'SUBMITTED', 'UNDER_REVIEW', 'REVIEWED', 'ACCEPTED', 'FAILED', 'REVISION_REQUESTED'].forEach(s => {
    const btn = document.getElementById(`accf-${s || 'ALL'}`);
    if (btn) btn.className = `btn btn-sm ${s === _accStaffStatus ? 'btn-primary' : 'btn-secondary'}`;
  });
  await loadAccStaff();
}

async function loadAccStaff() {
  const el = document.getElementById('acc-staff-list');
  try {
    let url = `/acceptance?page=${_accStaffPage}&size=20`;
    if (_accStaffStatus) url += `&status=${_accStaffStatus}`;
    const data = await API.get(url);
    if (!data.items || !data.items.length) { el.innerHTML = '<p class="empty">Không có hồ sơ nghiệm thu.</p>'; return; }
    const vLabel = { excellent: '🏆 Xuất sắc', good: '🥇 Tốt', pass: '✅ Đạt', fail: '❌ Không đạt', revise_required: '📝 Cần bổ sung' };
    el.innerHTML = `<table><thead><tr>
      <th>Đề tài</th><th>Giảng viên</th><th>Trạng thái</th><th>Kết quả</th><th>Nộp lúc</th><th>Thao tác</th>
    </tr></thead><tbody>
    ${data.items.map(d => `<tr>
      <td class="cell-truncate" title="${d.proposal_title || ''}">${d.proposal_title || d.proposal_id}</td>
      <td>${d.submitted_by_name || '—'}</td>
      <td>${badge(d.status)}</td>
      <td>${d.final_verdict ? `<span class="text-small">${vLabel[d.final_verdict] || d.final_verdict}</span>` : '—'}</td>
      <td>${fmtDateShort(d.submitted_at || d.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewAccDossierStaff('${d.id}')">🔍 Xem</button>
        ${d.status === 'SUBMITTED' ? `
          <button class="btn btn-sm btn-success" onclick="validateAccDossier('${d.id}','APPROVE')">✓ Duyệt</button>
          <button class="btn btn-sm btn-warning" onclick="openAccReturnModal('${d.id}')">↩ Trả về</button>` : ''}</td>
    </tr>`).join('')}
    </tbody></table>
    ${renderPagination(data.total, _accStaffPage, 'gotoAccStaffPage')}`;
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoAccStaffPage(p) { _accStaffPage = p; loadAccStaff(); }

async function validateAccDossier(dossierId, action, reason) {
  try {
    await API.post(`/acceptance/${dossierId}/validate`, { action, reason });
    const msg = action === 'APPROVE' ? '✅ Đã duyệt — chuyển sang UNDER_REVIEW!' : '↩ Đã trả về cho giảng viên!';
    showMsg(document.getElementById('msg-acc-staff'), msg, 'success');
    await loadAccStaff();
  } catch (e) { showMsg(document.getElementById('msg-acc-staff'), e.message); }
}

let _accReturnId = null;
function openAccReturnModal(dossierId) {
  _accReturnId = dossierId;
  document.getElementById('acc-return-reason').value = '';
  openModal('modal-acc-return');
}

async function viewAccDossierStaff(dossierId) {
  try {
    const d = await API.get(`/acceptance/${dossierId}`);
    const reviews = await API.get(`/acceptance/${dossierId}/reviews`).catch(() => []);
    const avgScore = reviews.length ? (reviews.reduce((s, r) => s + parseFloat(r.score || 0), 0) / reviews.length).toFixed(1) : null;
    const revHtml = reviews.length ? reviews.map(r => `
      <div class="info-box body-small mb-2">
        <div class="split-row"><b>${r.reviewer_name || '—'}</b>
          <span class="strong" style="color:${r.verdict === 'PASS' ? UI_COLORS.success : r.verdict === 'FAIL' ? UI_COLORS.danger : UI_COLORS.warning}">${r.verdict || '—'} | ${r.score || '—'}đ</span></div>
        ${r.comments ? `<p class="text-muted italic mt-1">"${r.comments}"</p>` : ''}
        <div class="text-muted text-small">${fmtDate(r.reviewed_at)}</div>
      </div>`).join('') : '<p class="text-muted body-small">Chưa có đánh giá.</p>';
    document.getElementById('modal-view-title').textContent = `Hồ sơ NT: ${d.proposal_title || d.proposal_id}`;
    document.getElementById('modal-view-body').innerHTML = `
      <div class="detail-grid">
        <div>
          <p><b>Trạng thái:</b> ${badge(d.status)}</p>
          <p><b>Giảng viên:</b> ${d.submitted_by_name || '—'}</p>
          <p><b>Nộp lúc:</b> ${fmtDate(d.submitted_at)}</p>
          ${d.revision_reason ? `<div class="info-box card-danger accent-left-danger body-small mt-2"><b>Lý do trả về:</b> ${d.revision_reason}</div>` : ''}
          <div class="body-small mt-2"><b>Báo cáo tổng kết:</b>
            <div class="text-box">${d.final_report}</div></div>
          <div class="body-small mt-2"><b>Sản phẩm đạt được:</b>
            <div class="text-box">${d.achievements}</div></div>
          ${d.deliverables ? `<div class="body-small mt-2"><b>Sản phẩm cụ thể:</b> ${d.deliverables}</div>` : ''}
          ${d.impact_summary ? `<div class="body-small mt-2"><b>Ứng dụng/Tác động:</b> ${d.impact_summary}</div>` : ''}
          ${d.completion_explanation ? `<div class="body-small mt-2"><b>Giải trình:</b> ${d.completion_explanation}</div>` : ''}
        </div>
        <div>
          ${avgScore ? `<div class="card surface-success text-center mb-3">
            <div class="stat-value">${avgScore}</div>
            <div class="body-small">Điểm TB (${reviews.length} reviewer)</div></div>` : ''}
          <h4 class="mb-2">Đánh giá hội đồng:</h4>
          ${revHtml}
          ${d.status === 'SUBMITTED' ? `<div class="action-row mt-3">
            <button class="btn btn-success" onclick="validateAccDossier('${d.id}','APPROVE');closeModal('modal-view')">✓ Chấp nhận hồ sơ</button>
            <button class="btn btn-warning" onclick="closeModal('modal-view');openAccReturnModal('${d.id}')">↩ Trả về</button></div>` : ''}
        </div>
      </div>`;
    openModal('modal-view');
  } catch (e) { alert(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-acc-return')?.addEventListener('click', async () => {
    const reason = document.getElementById('acc-return-reason').value.trim();
    if (!reason || reason.length < 10) return alert('Lý do tối thiểu 10 ký tự');
    await validateAccDossier(_accReturnId, 'RETURN', reason);
    closeModal('modal-acc-return');
  });
});




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
          <td>${p.title}</td><td>${p.pi_name}</td><td>${p.field_name || '—'}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="viewReviewsForApproval('${p.id}')">Xem đánh giá</button>
            <button class="btn btn-sm btn-success" onclick="makeDecision('${p.id}','APPROVED')">✓ Phê duyệt</button>
            <button class="btn btn-sm btn-danger" onclick="openRejectModal('${p.id}')">✗ Từ chối</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;

    html += renderPagination(data.total, _approvePage, 'gotoApprovePage');
    el.innerHTML = html;
  } catch (e) { document.getElementById('approve-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoApprovePage(p) { _approvePage = p; loadApproveList(); }

async function viewReviewsForApproval(id) {
  try {
    const reviews = await API.get(`/reviews/proposal/${id}`);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + parseFloat(r.score || 0), 0) / reviews.length).toFixed(1) : '—';
    document.getElementById('modal-view-title').textContent = 'Kết quả phản biện';
    document.getElementById('modal-view-body').innerHTML = `
      <p><b>Điểm trung bình: ${avg}</b></p>
      <table><tr><th>Phản biện</th><th>Điểm</th><th>Kết luận</th><th>Nhận xét</th></tr>
      ${reviews.map(r => `<tr><td>${r.reviewer_name}</td><td>${r.score || '—'}</td><td>${r.verdict || '—'}</td><td>${r.comments || '—'}</td></tr>`).join('')}
      </table>`;
    openModal('modal-view');
  } catch (e) { alert(e.message); }
}

async function makeDecision(id, decision, reason) {
  try {
    await API.post(`/proposals/${id}/approve`, { decision, reason });
    showMsg(document.getElementById('msg-approve'), decision === 'APPROVED' ? 'Đã phê duyệt!' : 'Đã từ chối!', 'success');
    await loadApproveList();
  } catch (e) { showMsg(document.getElementById('msg-approve'), e.message); }
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
  el.innerHTML = `<div class="section-header"><h2>Xác nhận nghiệm thu</h2></div>
    <div id="msg-confirm"></div>
    <div id="accept-confirm-list">Đang tải...</div>`;
  await loadAcceptConfirmList();
});

async function loadAcceptConfirmList() {
  const el = document.getElementById('accept-confirm-list');
  try {
    const data = await API.get('/acceptance?size=50');
    const items = (data.items || []).filter(d => ['UNDER_REVIEW', 'REVIEWED'].includes(d.status));
    
    if (!items.length) { el.innerHTML = '<p class="empty">Không có hồ sơ chờ xác nhận.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Đề tài</th><th>Giảng viên</th><th>Trạng thái</th><th>Nộp lúc</th><th>Thao tác</th></tr></thead>
    <tbody>${items.map(d => `<tr>
      <td class="cell-truncate" title="${d.proposal_title || d.proposal_id}">${d.proposal_title || d.proposal_id}</td>
      <td>${d.submitted_by_name || '—'}</td>
      <td>${badge(d.status)}</td>
      <td>${fmtDateShort(d.submitted_at || d.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewAccDossierStaff('${d.id}')">🔍 Xem</button>
        <button class="btn btn-sm btn-primary" onclick="openAccFinalizeModal('${d.id}')">Xác nhận kết quả</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

let _accFinalizeId = null;
function openAccFinalizeModal(dossierId) {
  _accFinalizeId = dossierId;
  document.getElementById('acc-finalize-verdict').value = 'pass';
  document.getElementById('acc-finalize-note').value = '';
  openModal('modal-acc-finalize');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-acc-finalize')?.addEventListener('click', async () => {
    const verdict = document.getElementById('acc-finalize-verdict').value;
    const note = document.getElementById('acc-finalize-note').value.trim();
    try {
      await API.post(`/acceptance/${_accFinalizeId}/finalize`, { verdict, note: note || null });
      showMsg(document.getElementById('msg-confirm'), '✅ Đã xác nhận kết quả nghiệm thu!', 'success');
      closeModal('modal-acc-finalize');
      await loadAcceptConfirmList();
    } catch (e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: LEADERSHIP — MONITOR (legacy redirect to progress-staff)
// ══════════════════════════════════════════════════════════════════
registerPage('monitor', async () => {
  _monitorPage = 1;
  const el = document.getElementById('page-monitor');
  el.innerHTML = `<div class="section-header"><h2>📈 Theo dõi tiến độ đề tài</h2></div><div id="monitor-list">Đang tải...</div>`;
  await loadMonitorList();
});

async function loadMonitorList() {
  try {
    const data = await API.get(`/progress?page=${_monitorPage}&size=${PAGE_SIZE}`);
    const el = document.getElementById('monitor-list');
    if (!data.items.length) { el.innerHTML = '<p class="empty">Chưa có báo cáo.</p>'; return; }
    let html = `<table>
      <thead><tr><th>Đề tài</th><th>Người nộp</th><th>Kỳ</th><th>Tiến độ</th><th>Trạng thái</th><th>Ngày nộp</th></tr></thead>
      <tbody>${data.items.map(r => `<tr>
        <td class="cell-truncate">${r.proposal_title || r.proposal_id}</td>
        <td>${r.submitted_by_name || '—'}</td>
        <td>${r.report_period || '#' + r.report_order}</td>
        <td><b style="color:${getProgressColor(r.status)}">${r.completion_pct}%</b>
          ${r.is_overdue ? '<span class="badge badge-danger">⚠️</span>' : ''}
        </td>
        <td>${badge(r.status)}</td>
        <td>${fmtDateShort(r.submitted_at)}</td>
      </tr>`).join('')}</tbody></table>`;
    html += renderPagination(data.total, _monitorPage, 'gotoMonitorPage');
    el.innerHTML = html;
  } catch (e) { document.getElementById('monitor-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoMonitorPage(p) { _monitorPage = p; loadMonitorList(); }


// ══════════════════════════════════════════════════════════════════
// PAGE: STAFF — PROGRESS MONITORING BOARD
// ══════════════════════════════════════════════════════════════════
let _progStaffPage = 1;
let _progStaffFilter = 'ALL';

registerPage('progress-staff', async () => {
  _progStaffPage = 1;
  const el = document.getElementById('page-progress-staff');
  el.innerHTML = `
    <div class="section-header"><h2>📊 Theo dõi tiến độ — Phòng KHCN</h2></div>
    <div id="msg-prog-staff"></div>
    <div class="card filter-panel">
      <div class="filter-row">
        <span class="filter-label">Lọc:</span>
        ${['ALL', 'SUBMITTED', 'ACCEPTED', 'NEEDS_REVISION', 'DELAYED'].map(s =>
    `<button class="btn btn-sm ${s === 'ALL' ? 'btn-primary' : 'btn-secondary'}" id="filter-${s}" onclick="filterProgressStaff('${s}')">
            ${s === 'ALL' ? 'Tất cả' : s}
          </button>`).join('')}
        <button class="btn btn-sm btn-danger" onclick="filterProgressStaff('OVERDUE')"
          id="filter-OVERDUE">⚠️ Chậm tiến độ</button>
      </div>
    </div>
    <div id="prog-staff-list">Đang tải...</div>`;
  await loadProgressStaff();
});

async function filterProgressStaff(status) {
  _progStaffFilter = status;
  _progStaffPage = 1;
  ['ALL', 'SUBMITTED', 'ACCEPTED', 'NEEDS_REVISION', 'DELAYED', 'OVERDUE'].forEach(s => {
    const btn = document.getElementById(`filter-${s}`);
    if (btn) btn.className = `btn btn-sm ${s === status ? 'btn-primary' : (s === 'OVERDUE' ? 'btn-danger' : 'btn-secondary')}`;
  });
  await loadProgressStaff();
}

async function loadProgressStaff() {
  const el = document.getElementById('prog-staff-list');
  try {
    let url;
    if (_progStaffFilter === 'OVERDUE') {
      url = `/progress/overdue?page=${_progStaffPage}&size=${PAGE_SIZE}`;
    } else if (_progStaffFilter === 'ALL') {
      url = `/progress?page=${_progStaffPage}&size=${PAGE_SIZE}`;
    } else {
      url = `/progress?status=${_progStaffFilter}&page=${_progStaffPage}&size=${PAGE_SIZE}`;
    }
    const data = await API.get(url);
    if (!data.items.length) { el.innerHTML = '<p class="empty">Không có báo cáo.</p>'; return; }

    const sl = { SUBMITTED: 'Đã nộp', ACCEPTED: 'Chấp nhận', NEEDS_REVISION: 'Cần bổ sung', DELAYED: 'Chậm tiến độ' };

    let html = `<table>
      <thead><tr><th>Đề tài</th><th>Giảng viên</th><th>Kỳ báo cáo</th><th>Hoàn thành</th><th>Trạng thái</th><th>Ngày nộp</th><th>Thao tác</th></tr></thead>
      <tbody>${data.items.map(r => `<tr class="${r.is_overdue ? 'row-danger' : ''}">
        <td class="cell-truncate" title="${r.proposal_title || ''}"><a href="#" onclick="viewProgressDetail('${r.id}');return false">${r.proposal_title || r.proposal_id}</a></td>
        <td>${r.submitted_by_name || '—'}</td>
        <td>${r.report_period || 'Kỳ #' + r.report_order}</td>
        <td>
          <div class="inline-actions">
            <div class="mini-progress">
              <div class="mini-progress-fill" style="--progress-value:${r.completion_pct}%;--progress-color:${getProgressColor(r.status)}"></div>
            </div>
            <span class="strong text-small">${r.completion_pct}%</span>
            ${r.is_overdue ? '<span class="badge badge-danger">⚠️</span>' : ''}
          </div>
        </td>
        <td><span class="status-pill" style="--status-color:${getProgressColor(r.status)}">${sl[r.status] || r.status}</span></td>
        <td>${fmtDateShort(r.submitted_at)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewProgressDetail('${r.id}')">Xem</button>
          ${r.status === 'SUBMITTED' ? `<button class="btn btn-sm btn-primary" onclick="openProgressReview('${r.id}')">Review</button>` : ''}
        </td>
      </tr>`).join('')}</tbody></table>`;

    html += renderPagination(data.total, _progStaffPage, 'gotoProgStaffPage');
    el.innerHTML = html;
  } catch (e) { el.innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoProgStaffPage(p) { _progStaffPage = p; loadProgressStaff(); }

async function viewProgressDetail(reportId) {
  try {
    const r = await API.get(`/progress/reports/${reportId}`);
    const sl = { SUBMITTED: 'Đã nộp', ACCEPTED: 'Chấp nhận', NEEDS_REVISION: 'Cần bổ sung', DELAYED: 'Chậm tiến độ' };
    document.getElementById('modal-view-title').textContent = `Báo cáo tiến độ kỳ #${r.report_order}${r.report_period ? ' — ' + r.report_period : ''}`;
    document.getElementById('modal-view-body').innerHTML = `
      <div class="detail-grid">
        <div>
          <p><b>Đề tài:</b> ${r.proposal_title || r.proposal_id}</p>
          <p><b>Giảng viên:</b> ${r.submitted_by_name || '—'}</p>
          <p><b>Tiến độ:</b> <span class="metric-value" style="color:${getProgressColor(r.status)}">${r.completion_pct}%</span></p>
          <p><b>Trạng thái:</b> <span class="status-pill" style="--status-color:${getProgressColor(r.status)}">${sl[r.status] || r.status}</span>
            ${r.is_overdue ? ' <span class="badge badge-danger">⚠️ Quá hạn</span>' : ''}</p>
          <p><b>Ngày nộp:</b> ${fmtDate(r.submitted_at)}</p>
          ${r.attachment_url ? `<p><b>Minh chứng:</b> <a href="${r.attachment_url}" target="_blank">🔗 Xem tài liệu</a></p>` : ''}
        </div>
        <div>
          ${r.review_note ? `<div class="info-box surface-success accent-left-success">
            <b>Nhận xét Phòng KHCN:</b><br>${r.review_note}
            <div class="text-muted text-small mt-1">${fmtDate(r.reviewed_at)}</div>
          </div>` : '<p class="text-muted">Chưa có review.</p>'}
        </div>
      </div>
      <div class="mt-3">
        <h4>Công việc đã hoàn thành:</h4><p class="text-box">${r.content}</p>
        ${r.products_created ? `<h4>Sản phẩm:</h4><p class="text-box">${r.products_created}</p>` : ''}
        ${r.issues ? `<h4>Khó khăn / Rủi ro:</h4><p class="info-box surface-warning accent-left-warning">${r.issues}</p>` : ''}
        <h4>Kế hoạch tiếp theo:</h4><p class="text-box">${r.next_steps}</p>
      </div>`;
    openModal('modal-view');
  } catch (e) { alert(e.message); }
}

async function openProgressReview(reportId) {
  document.getElementById('progress-review-id').value = reportId;
  document.getElementById('progress-review-status').value = 'ACCEPTED';
  document.getElementById('progress-review-note').value = '';
  // Load report detail for context
  try {
    const r = await API.get(`/progress/reports/${reportId}`);
    document.getElementById('modal-progress-review-body').innerHTML = `
      <div class="info-box">
        <b>${r.proposal_title || r.proposal_id}</b> | Kỳ #${r.report_order}${r.report_period ? ' — ' + r.report_period : ''}
        <div class="body-small mt-1">
          <span class="metric-value" style="color:${getProgressColor(r.status)}">${r.completion_pct}%</span> hoàn thành
          ${r.is_overdue ? ' <span class="badge badge-danger">⚠️ Quá hạn</span>' : ''}
        </div>
        <p class="text-muted text-small mt-2">${r.content.substring(0, 200)}...</p>
      </div>`;
  } catch (e) { document.getElementById('modal-progress-review-body').innerHTML = ''; }
  openModal('modal-progress-review');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-progress-review')?.addEventListener('click', async () => {
    const reportId = document.getElementById('progress-review-id').value;
    const status = document.getElementById('progress-review-status').value;
    const note = document.getElementById('progress-review-note').value.trim();
    if (status === 'NEEDS_REVISION' && note.length < 5) return alert('Vui lòng nhập ghi chú cho yêu cầu bổ sung');
    try {
      await API.post(`/progress/reports/${reportId}/review`, { status, note: note || null });
      closeModal('modal-progress-review');
      showMsg(document.getElementById('msg-prog-staff'), 'Review thành công!', 'success');
      await loadProgressStaff();
    } catch (e) { alert(e.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: REVIEWER — MY REVIEWS
// ══════════════════════════════════════════════════════════════════
registerPage('my-reviews', async () => {
  const el = document.getElementById('page-my-reviews');
  el.innerHTML = `<div class="section-header"><h2>Phản biện được phân công</h2></div>
    <div id="msg-my-reviews"></div><div id="my-reviews-list">Đang tải danh sách...</div>`;
  try {
    console.log('Fetching my reviews from /api/reviews/reviewer-list...');
    const reviews = await API.get('/reviews/reviewer-list');
    console.log('Reviews received:', reviews);

    const el2 = document.getElementById('my-reviews-list');
    if (!reviews || !reviews.length) {
      el2.innerHTML = '<p class="empty">Bạn hiện không có đề tài nào được phân công phản biện.</p>';
      return;
    }

    el2.innerHTML = `<table>
      <thead><tr><th>Tên đề tài</th><th>Trạng thái</th><th>Điểm</th><th>Thao tác</th></tr></thead>
      <tbody>${reviews.map(r => `<tr>
        <td title="${r.proposal_id}">${r.proposal_title || 'N/A'}</td>
        <td>${badge(r.status)}</td>
        <td>${r.score || '—'}</td>
        <td>
          ${r.status === 'PENDING' ?
        `<button class="btn btn-sm btn-primary" onclick="openSubmitReview('${r.council_id}','${r.proposal_id}')">Nộp đánh giá</button>` :
        `<button class="btn btn-sm btn-secondary" onclick="viewProposal('${r.proposal_id}')">Xem lại</button>`
      }
        </td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    console.error('My Reviews Page Error:', e);
    document.getElementById('my-reviews-list').innerHTML = `
      <div class="alert alert-error">
        <p><b>Lỗi kết nối:</b> ${e.message}</p>
        <p class="text-small mt-2">Vui lòng kiểm tra xem Server Backend (port 8000) có đang hoạt động không.</p>
      </div>`;
  }
});

let _reviewCtx = {};
let _currentCriteria = [];

async function openSubmitReview(councilId, proposalId) {
  _reviewCtx = { councilId, proposalId };
  const reviewScore = document.getElementById('review-score');
  reviewScore.value = '0';
  reviewScore.readOnly = true;
  reviewScore.classList.add('readonly-field');
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
        <div class="form-group mb-2">
          <label class="text-small">${c.label} (Tối đa ${c.max_score})</label>
          <input type="number" class="criteria-input" data-id="${c.id}" data-max="${c.max_score}" 
                 min="0" max="${c.max_score}" value="0" step="0.5" 
                 oninput="calcTotalReviewScore()">
        </div>
      `).join('');
    } else {
      container.style.display = 'none';
      reviewScore.readOnly = false;
      reviewScore.classList.remove('readonly-field');
    }
  } catch (e) {
    console.error('Failed to load criteria', e);
    criteriaInputs.innerHTML = '<p class="badge badge-danger">Không thể tải tiêu chí.</p>';
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
    } catch (e) { alert(e.message); }
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
        <td>${r.dossier_id}</td><td>${r.council_id}</td><td>${badge(r.status)}</td><td>${r.score || '—'}</td>
        <td>${r.status === 'PENDING' ? `<button class="btn btn-sm btn-primary" onclick="openAccReview('${r.dossier_id}','${r.council_id}')">Nộp đánh giá</button>` : '—'}</td>
      </tr>`).join('')}</tbody></table>`;
  } catch (e) { document.getElementById('my-acc-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
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
    } catch (e) { alert(e.message); }
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
        <td>${u.department_name || '—'}</td><td>${u.is_active ? '✅' : '❌'}</td>
      </tr>`).join('')}</tbody></table>`;

    html += renderPagination(data.total, _userPage, 'gotoUserPage');
    el.innerHTML = html;
  } catch (e) { document.getElementById('users-list').innerHTML = `<p class="alert alert-error">${e.message}</p>`; }
}

function gotoUserPage(p) { _userPage = p; loadUsers(); }

document.addEventListener('DOMContentLoaded', async () => {
  const deptsResp = await API.get('/catalog/departments?size=100').catch(() => ({ items: [] }));
  const depts = deptsResp.items || deptsResp || [];
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
    } catch (err) { alert(err.message); }
  });
});


// ══════════════════════════════════════════════════════════════════
// PAGE: ADMIN/STAFF — CATALOG
// ══════════════════════════════════════════════════════════════════

const CATALOG_CONFIGS = {
  'departments': {
    title: 'Khoa / Phòng',
    cols: [{ k: 'name', label: 'Tên' }, { k: 'code', label: 'Mã' }],
    schema: [{ k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'code', label: 'Mã *', type: 'text', req: true }]
  },
  'research-fields': {
    title: 'Lĩnh vực nghiên cứu',
    cols: [{ k: 'name', label: 'Tên' }, { k: 'code', label: 'Mã' }],
    schema: [{ k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'code', label: 'Mã *', type: 'text', req: true }]
  },
  'proposal-categories': {
    title: 'Loại đề tài',
    cols: [{ k: 'name', label: 'Tên' }, { k: 'level', label: 'Cấp' }, { k: 'max_duration_months', label: 'T.gian Tối đa' }],
    schema: [
      { k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'code', label: 'Mã *', type: 'text', req: true },
      { k: 'level', label: 'Cấp *', type: 'select', req: true, opts: [{ v: 'UNIVERSITY', l: 'Cấp Trường' }, { v: 'FACULTY', l: 'Cấp Khoa' }, { v: 'MINISTERIAL', l: 'Cấp Bộ' }] },
      { k: 'max_duration_months', label: 'TG tối đa (tháng)', type: 'number' },
      { k: 'description', label: 'Mô tả', type: 'textarea' }
    ]
  },
  'council-types': {
    title: 'Loại hội đồng',
    cols: [{ k: 'name', label: 'Tên' }, { k: 'code', label: 'Mã' }],
    schema: [{ k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'code', label: 'Mã *', type: 'text', req: true }, { k: 'description', label: 'Mô tả', type: 'textarea' }]
  },
  'evaluation-criteria': {
    title: 'Mẫu tiêu chí ĐG',
    cols: [{ k: 'name', label: 'Tên' }],
    schema: [{ k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'description', label: 'Mô tả', type: 'textarea' }]
  },
  'proposal-statuses': {
    title: 'Cấu hình trạng thái',
    cols: [{ k: 'name', label: 'Tên' }, { k: 'code', label: 'Mã' }],
    schema: [{ k: 'name', label: 'Tên *', type: 'text', req: true }, { k: 'code', label: 'Mã *', type: 'text', req: true }, { k: 'description', label: 'Mô tả', type: 'textarea' }]
  }
};

let _currentCatalog = 'departments';
let _catPage = 1;
let _catEditId = null;

registerPage('catalog', async () => {
  renderCatalogNav();
  document.getElementById('catalog-search').oninput = debounce(() => { _catPage = 1; loadCatalogData(); }, 400);
  document.getElementById('catalog-status').onchange = () => { _catPage = 1; loadCatalogData(); };
  document.getElementById('btn-add-catalog').onclick = () => openCatalogForm(null);

  document.getElementById('form-catalog').onsubmit = handleCatalogSubmit;

  await changeCatalogTab('departments');
});

function debounce(func, wait) {
  let timeout; return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

function renderCatalogNav() {
  const ul = document.getElementById('catalog-nav');
  ul.innerHTML = Object.entries(CATALOG_CONFIGS).map(([k, v]) => `
    <li>
      <a href="#" class="btn btn-sm ${k === _currentCatalog ? 'btn-primary' : 'btn-secondary'}" 
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
  tbody.innerHTML = '<tr><td colspan="10" class="text-center">Đang tải...</td></tr>';

  try {
    const res = await API.getCatalogs(_currentCatalog, { page: _catPage, size: 10, search, is_active: isActive });
    if (!res.items.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty">Không tìm thấy dữ liệu.</td></tr>';
    } else {
      tbody.innerHTML = res.items.map(item => `
        <tr class="${!item.is_active ? 'row-muted' : ''}">
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
    for (let i = 1; i <= totalPages; i++) {
      phtml += `<button class="btn btn-sm ${i === _catPage ? 'btn-primary' : 'btn-secondary'}" onclick="gotoCatalogPage(${i})">${i}</button>`;
    }
    document.getElementById('catalog-pagination').innerHTML = phtml;
  } catch (e) {
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
      html += `<select name="${s.k}" ${s.req ? 'required' : ''}>
        <option value="">— Chọn —</option>
        ${s.opts.map(o => `<option value="${o.v}" ${val === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
      </select>`;
    } else if (s.type === 'textarea') {
      html += `<textarea name="${s.k}" ${s.req ? 'required' : ''}>${val}</textarea>`;
    } else {
      html += `<input type="${s.type}" name="${s.k}" value="${val}" ${s.req ? 'required' : ''}>`;
    }
    html += `</div>`;
  });

  if (item) {
    html += `<div class="form-group"><label>Trạng thái hoạt động</label>
      <select name="is_active"><option value="true" ${item.is_active ? 'selected' : ''}>Có</option><option value="false" ${!item.is_active ? 'selected' : ''}>Không</option></select>
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
  } catch (err) { alert(err.message); }
}

async function deleteCatalogItem(id) {
  if (!confirm('Bạn có chắc muốn vô hiệu hóa mục này? Các chức năng đang sử dụng sẽ không bị ảnh hưởng, nhưng sẽ không thể chọn mới.')) return;
  try {
    await API.deleteCatalog(_currentCatalog, id);
    loadCatalogData();
  } catch (err) { alert(err.message); }
}
