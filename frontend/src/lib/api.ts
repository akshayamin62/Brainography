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

export const authAPI = {
  login: (data: { email: string; captcha: string; captchaInput: string }) =>
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

export default api;

