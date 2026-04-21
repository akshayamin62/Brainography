import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Helper to append auth token to URLs for protected static files
export const withToken = (url: string): string => {
  if (typeof window === 'undefined') return url;
  const token = localStorage.getItem('token');
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${token}`;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // BUG-042: 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// BUG-043: Add 401 response interceptor for token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid — clear auth state and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenExpiry');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  getCaptcha: () =>
    api.get('/auth/captcha'),

  login: (data: { email: string; captchaId: string; captchaInput: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  getProfile: () =>
    api.get('/auth/profile'),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const adminAPI = {
  list: () => api.get('/admins'),
  get: (id: string) => api.get(`/admins/${id}`),
  create: (data: any) =>
    api.post('/admins', data),
  update: (id: string, data: any) =>
    api.put(`/admins/${id}`, data),
};

export const counselorAPI = {
  list: () => api.get('/counselors'),
  get: (id: string) => api.get(`/counselors/${id}`),
  create: (data: any) => api.post('/counselors', data),
  update: (id: string, data: any) => api.put(`/counselors/${id}`, data),
};

export const studentAPI = {
  list: () => api.get('/students'),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
};

export const fingerprintAPI = {
  getAll: (studentId: string) => api.get(`/fingerprints/${studentId}`),
  upload: (data: { studentId: string; fingerPosition: string; fingerType: string; imageData: string }) =>
    api.post('/fingerprints/upload', data),
  downloadUrl: (studentId: string) => `${API_URL}/fingerprints/download/${studentId}`,
};

export const documentAPI = {
  list: (studentId: string) => api.get(`/documents/${studentId}`),
  upload: (studentId: string, formData: FormData) =>
    api.post(`/documents/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadUrl: (docId: string) => `${API_URL}/documents/download/${docId}`,
};

export const analysisAPI = {
  get: (studentId: string) => api.get(`/fingerprint-analysis/${studentId}`),
  save: (studentId: string, data: Record<string, { pattern: string; ridgeCount: number }>) =>
    api.post(`/fingerprint-analysis/${studentId}`, { data }),
};

export const reportAPI = {
  calculate: (studentId: string) => api.post(`/reports/calculate/${studentId}`),
  generateUrl: (studentId: string) => `${API_URL}/reports/generate/${studentId}`,
};

export const paymentAPI = {
  generateLink: (studentId: string) => api.post(`/payments/generate-link/${studentId}`),
  getStatus: (studentId: string) => api.get(`/payments/status/${studentId}`),
  getLogs: (studentId: string) => api.get(`/payments/logs/${studentId}`),
  getAllLogs: () => api.get('/payments/all-logs'),
  verifyPayment: (params: string) => axios.get(`${API_URL}/payments/verify-payment?${params}`),
  downloadInvoice: (paymentId: string) => api.get(`/payments/invoice/${paymentId}/download`, { responseType: 'blob' }),
  sendInvoice: (paymentId: string) => api.post(`/payments/invoice/${paymentId}/send`),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: { baseAmount?: number; gstEnabled?: boolean }) => api.put('/settings', data),
};

export default api;

