const BASE_URL = window.location.port === '5173' ? '/api' : 'http://localhost:5000/api';

export async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin');
  const storedToken = token || (
    isAdminRoute
      ? (localStorage.getItem('papido_admin_token') || localStorage.getItem('papido_user_token'))
      : (localStorage.getItem('papido_user_token') || localStorage.getItem('papido_admin_token'))
  );

  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const config = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `API Error: ${res.statusText}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to Papido Backend API at http://localhost:5000. Please ensure the backend server is running.');
    }
    console.error(`[API Error] ${method} ${endpoint}:`, err);
    throw err;
  }
}
