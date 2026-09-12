const API_BASE = '/api/v1';
let currentToken = localStorage.getItem('token');
let currentPage = 'dashboard';

// API Helper
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}

// Auth
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    currentToken = result.data.accessToken;
    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(result.data.user));

    showDashboard();
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentToken = null;
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    currentPage = item.dataset.page;
    document.getElementById('page-title').textContent = item.querySelector('span').textContent;
    loadPage(currentPage);
  });
});

// Load Pages
async function loadPage(page) {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading">Loading...</div>';

  try {
    switch (page) {
      case 'dashboard': await loadDashboard(content); break;
      case 'secrets': await loadSecrets(content); break;
      case 'certificates': await loadCertificates(content); break;
      case 'policies': await loadPolicies(content); break;
      case 'audit': await loadAudit(content); break;
      case 'admin': await loadAdmin(content); break;
      default: content.innerHTML = '<p>Page not found</p>';
    }
  } catch (error) {
    content.innerHTML = `<p class="error">Error loading page: ${error.message}</p>`;
  }
}

// Dashboard
async function loadDashboard(container) {
  const [overview, recommendations] = await Promise.all([
    api('/dashboard/overview'),
    api('/ai/recommendations')
  ]);

  const d = overview.data;

  container.innerHTML = `
    <div class="stats-grid fade-in">
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
        </div>
        <div class="stat-value" style="color: var(--orange)">${d.secrets?.total || 0}</div>
        <div class="stat-label">Total Secrets</div>
        <div class="stat-change">${d.secrets?.expiring_soon || 0} expiring soon</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <div class="stat-icon yellow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
          </div>
        </div>
        <div class="stat-value" style="color: var(--yellow)">${d.certificates?.total || 0}</div>
        <div class="stat-label">Certificates</div>
        <div class="stat-change">${d.certificates?.expiring_soon || 0} expiring soon</div>
      </div>
    </div>

    <div class="grid-2 fade-in">
      <div class="card glass">
        <div class="card-header">
          <h3 class="card-title">Recent Events</h3>
        </div>
        <div class="event-list">
          ${(d.recentEvents || []).slice(0, 5).map(e => `
            <div class="event-item">
              <div class="event-dot ${e.severity === 'high' ? 'error' : e.severity === 'medium' ? 'warning' : 'info'}"></div>
              <div class="event-content">
                <div class="event-title">${e.action}</div>
                <div class="event-meta">${e.event_type} • ${new Date(e.created_at).toLocaleString()}</div>
              </div>
            </div>
          `).join('') || '<p style="color: var(--gray-light)">No recent events</p>'}
        </div>
      </div>

      <div class="card glass">
        <div class="card-header">
          <h3 class="card-title">AI Recommendations</h3>
          <span class="badge info">AI</span>
        </div>
        <div class="event-list">
          ${(recommendations.data?.recommendations || []).map(r => `
            <div class="event-item">
              <div class="event-dot ${r.priority === 'high' ? 'error' : r.priority === 'medium' ? 'warning' : 'info'}"></div>
              <div class="event-content">
                <div class="event-title">${r.title}</div>
                <div class="event-meta">${r.description}</div>
              </div>
            </div>
          `).join('') || '<p style="color: var(--gray-light)">No recommendations</p>'}
        </div>
      </div>
    </div>
  `;
}

// Secrets
async function loadSecrets(container) {
  const result = await api('/secrets');
  const secrets = result.data.secrets || [];

  container.innerHTML = `
    <div class="card glass fade-in">
      <div class="card-header">
        <h3 class="card-title">Secrets Management</h3>
        <button class="btn btn-primary btn-sm" onclick="showCreateSecret()">+ New Secret</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Status</th><th>Last Rotated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${secrets.map(s => `
              <tr>
                <td>${s.name}</td>
                <td><span class="badge info">${s.type}</span></td>
                <td><span class="badge ${s.status}">${s.status}</span></td>
                <td>${s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : 'Never'}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="rotateSecret('${s.id}')">Rotate</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--gray-light)">No secrets found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Certificates
async function loadCertificates(container) {
  const result = await api('/certificates');
  const certs = result.data.certificates || [];

  container.innerHTML = `
    <div class="card glass fade-in">
      <div class="card-header">
        <h3 class="card-title">Certificate Lifecycle Management</h3>
        <button class="btn btn-primary btn-sm" onclick="showCreateCert()">+ Request Certificate</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Name</th><th>Common Name</th><th>Type</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${certs.map(c => `
              <tr>
                <td>${c.name}</td>
                <td>${c.common_name}</td>
                <td><span class="badge info">${c.type}</span></td>
                <td>${new Date(c.not_after).toLocaleDateString()}</td>
                <td><span class="badge ${c.status}">${c.status}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="renewCert('${c.id}')">Renew</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--gray-light)">No certificates found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Policies
async function loadPolicies(container) {
  const result = await api('/policies');
  const policies = result.data.policies || [];

  container.innerHTML = `
    <div class="card glass fade-in">
      <div class="card-header">
        <h3 class="card-title">Policy Engine</h3>
        <button class="btn btn-primary btn-sm" onclick="showCreatePolicy()">+ New Policy</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Effect</th><th>Priority</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${policies.map(p => `
              <tr>
                <td>${p.name}</td>
                <td><span class="badge info">${p.type}</span></td>
                <td><span class="badge ${p.effect === 'allow' ? 'active' : 'critical'}">${p.effect}</span></td>
                <td>${p.priority}</td>
                <td><span class="badge ${p.enabled ? 'active' : 'warning'}">${p.enabled ? 'Enabled' : 'Disabled'}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align: center; color: var(--gray-light)">No policies configured</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Audit
async function loadAudit(container) {
  const result = await api('/audit?limit=50');
  const events = result.data.events || [];

  container.innerHTML = `
    <div class="card glass fade-in">
      <div class="card-header">
        <h3 class="card-title">Audit Log</h3>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Event</th><th>Action</th><th>Status</th><th>Actor</th><th>Resource</th><th>Time</th></tr>
          </thead>
          <tbody>
            ${events.map(e => `
              <tr>
                <td><span class="badge info">${e.event_type}</span></td>
                <td>${e.action}</td>
                <td><span class="badge ${e.status === 'success' ? 'active' : 'critical'}">${e.status}</span></td>
                <td>${e.actor_name || e.actor_id || 'System'}</td>
                <td>${e.resource_name || e.resource_type || '-'}</td>
                <td>${new Date(e.created_at).toLocaleString()}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--gray-light)">No audit events</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Admin
async function loadAdmin(container) {
  const result = await api('/admin/users');
  const users = result.data.users || [];

  container.innerHTML = `
    <div class="card glass fade-in">
      <div class="card-header">
        <h3 class="card-title">User Management</h3>
        <button class="btn btn-primary btn-sm" onclick="showCreateUser()">+ New User</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Last Login</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${(u.roles || []).map(r => `<span class="badge info">${r}</span>`).join(' ')}</td>
                <td><span class="badge ${u.status}">${u.status}</span></td>
                <td>${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Action Functions
async function rotateSecret(id) {
  if (confirm('Are you sure you want to rotate this secret?')) {
    await api(`/secrets/${id}/rotate`, { method: 'POST' });
    loadPage('secrets');
  }
}

async function renewCert(id) {
  if (confirm('Are you sure you want to renew this certificate?')) {
    await api(`/certificates/${id}/renew`, { method: 'POST' });
    loadPage('certificates');
  }
}

// Show Dashboard
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadPage('dashboard');
}

// Check if already logged in
if (currentToken) {
  showDashboard();
}
