/* SciRes API Client — vanilla JS */

const API = (() => {
  const BASE = window.API_BASE || 'http://localhost:8000/api';

  function token() { return localStorage.getItem('scires_token'); }
  function refreshToken() { return localStorage.getItem('scires_refresh_token'); }
  function setToken(t, r) { 
    if(t) localStorage.setItem('scires_token', t); 
    if(r) localStorage.setItem('scires_refresh_token', r); 
  }
  function clearToken() { 
    localStorage.removeItem('scires_token'); 
    localStorage.removeItem('scires_refresh_token'); 
    localStorage.removeItem('scires_user'); 
  }
  function getUser() { try { return JSON.parse(localStorage.getItem('scires_user')); } catch { return null; } }
  function setUser(u) { localStorage.setItem('scires_user', JSON.stringify(u)); }

  async function request(method, path, body, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = `Bearer ${t}`;
    
    let res = await fetch(BASE + path, {
      method, headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    
    // Auto refresh logic
    if (res.status === 401 && !isRetry && path !== '/auth/login' && path !== '/auth/refresh') {
      const rToken = refreshToken();
      if (rToken) {
        try {
          const refreshRes = await fetch(BASE + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rToken })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setToken(refreshData.access_token, refreshData.refresh_token);
            // Retry request
            return request(method, path, body, true);
          }
        } catch (e) {
          console.error('Failed to refresh token', e);
        }
      }
      clearToken();
      location.href = '/';
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
  }

  return {
    token, setToken, clearToken, getUser, setUser,
    get:    (p)    => request('GET',    p),
    post:   (p, b) => request('POST',   p, b),
    put:    (p, b) => request('PUT',    p, b),
    delete: (p)    => request('DELETE', p),

    // Catalog specific (Generic)
    getCatalogs: (type, params) => {
      const q = new URLSearchParams();
      if(params.page) q.append('page', params.page);
      if(params.size) q.append('size', params.size);
      if(params.search) q.append('search', params.search);
      if(params.is_active !== undefined && params.is_active !== '') q.append('is_active', params.is_active);
      return request('GET', `/catalog/${type}?${q.toString()}`);
    },
    createCatalog: (type, data) => request('POST', `/catalog/${type}`, data),
    updateCatalog: (type, id, data) => request('PUT', `/catalog/${type}/${id}`, data),
    deleteCatalog: (type, id) => request('DELETE', `/catalog/${type}/${id}`),

    login: async (email, password) => {
      const data = await request('POST', '/auth/login', { email, password });
      setToken(data.access_token, data.refresh_token);
      const me = await request('GET', '/auth/me');
      setUser(me);
      return me;
    },
    logout: () => { clearToken(); location.href = '/'; },
  };
})();

// Helper to format status as badge
function badge(status) {
  const s = (status || '').toLowerCase().replace(/_/g, '_');
  return `<span class="badge badge-${s}">${status}</span>`;
}

function fmtDate(d) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }
function fmtDateShort(d) { return d ? new Date(d).toLocaleDateString('vi-VN') : '—'; }

// Show error/success
function showMsg(el, msg, type = 'error') {
  el.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 4000);
}

// Open / close modal
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
