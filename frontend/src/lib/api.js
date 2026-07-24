import axios from 'axios';

// SRS §4.7 — access token stored in browser memory, NOT localStorage (prevents XSS theft).
// Refresh token is in an httpOnly cookie set by the backend — we never touch it directly.
let _accessToken = null;

export function setAccessToken(token) { _accessToken = token; }
export function getAccessToken() { return _accessToken; }
export function clearAccessToken() { _accessToken = null; }

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// Attach the in-memory access token to every outgoing request
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// If a 401 comes back, try a silent token refresh once, then redirect to login
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearAccessToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
