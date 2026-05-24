import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('murato_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthSubmit = err.config?.url?.includes('/auth/login-pin') || 
                           err.config?.url?.includes('/auth/register') ||
                           err.config?.url?.includes('/auth/login');
      
      if (!isAuthSubmit && window.location.pathname !== '/login') {
        localStorage.removeItem('murato_token');
        localStorage.removeItem('murato_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
