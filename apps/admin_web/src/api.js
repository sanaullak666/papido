const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.port === '5173' ? '/api' : 'http://localhost:5000/api';
  }
  // Mobile / LAN testing e.g. 10.10.58.105
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname)) {
    return `http://${window.location.hostname}:5000/api`;
  }
  return '/api';
};

const BASE_URL = getBaseUrl();

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

export async function uploadFile(file, token = null) {
  const formData = new FormData();
  formData.append('file', file);

  const headers = {};
  const storedToken = token || localStorage.getItem('papido_user_token') || localStorage.getItem('papido_admin_token');
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  const res = await fetch(`${BASE_URL}/upload/file`, {
    method: 'POST',
    headers,
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'File upload failed.');
  }
  return data.data; // { url, filename, relativePath, ... }
}
