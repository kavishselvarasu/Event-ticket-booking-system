const rawApiUrl = import.meta.env.VITE_API_URL || '';
const BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`)
  : '/api';

// Retrieve or initialize unique client session ID for hold tracking
export function getSessionId() {
  let sess = localStorage.getItem('apex_session_id');
  if (!sess) {
    sess = `sess-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem('apex_session_id', sess);
  }
  return sess;
}

export function getAuthToken() {
  return localStorage.getItem('apex_auth_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('apex_auth_token', token);
  } else {
    localStorage.removeItem('apex_auth_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const sessionId = getSessionId();

  const headers = {
    'Content-Type': 'application/json',
    'X-Session-ID': sessionId,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body !== 'string') {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth & RBAC
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    me: () => request('/auth/me', { method: 'GET' }),
    switchDemoRole: (role, tenantId) => request('/auth/switch-demo-role', { method: 'POST', body: { role, tenantId } }),
  },

  // Events & Tiers
  events: {
    getAll: (tenantId = null) => request(`/events${tenantId ? `?tenantId=${tenantId}` : ''}`),
    getById: (id) => request(`/events/${id}`),
    create: (payload) => request('/events', { method: 'POST', body: payload }),
    getTenants: () => request('/events/tenants'),
  },

  // 10-Minute Hold Reservation Engine
  reservations: {
    createHold: (eventId, ticketTierId, quantity) =>
      request('/reservations/hold', { method: 'POST', body: { eventId, ticketTierId, quantity } }),
    getHold: (id) => request(`/reservations/hold/${id}`),
    cancelHold: (id) => request(`/reservations/hold/${id}`, { method: 'DELETE' }),
  },

  // Orders & Tickets
  orders: {
    checkout: (payload) => request('/orders/checkout', { method: 'POST', body: payload }),
    getById: (id) => request(`/orders/${id}`),
    getMyTickets: () => request('/orders/my-tickets'),
  },

  // Mock Payment Gateway
  payments: {
    simulate: (payload) => request('/payments/simulate', { method: 'POST', body: payload }),
  },

  // Analytics Dashboard
  analytics: {
    getOrganizer: (tenantId) => request(`/analytics/organizer${tenantId ? `?tenantId=${tenantId}` : ''}`),
    getAdmin: () => request('/analytics/admin'),
  },

  // System Health & Concurrency Stress Test
  system: {
    getHealth: () => request('/test/health'),
    runConcurrencyTest: (totalSeats = 5, concurrentRequests = 25) =>
      request('/test/concurrency', { method: 'POST', body: { totalSeats, concurrentRequests } }),
  }
};
