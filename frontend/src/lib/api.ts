import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

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
  login: (data: { email: string }) =>
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
  create: (data: { name: string; email: string; phone?: string }) =>
    api.post('/admins', data),
  update: (id: string, data: any) =>
    api.put(`/admins/${id}`, data),
  delete: (id: string) =>
    api.delete(`/admins/${id}`),
};

export const studentAPI = {
  list: () => api.get('/students'),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const fingerprintAPI = {
  getAll: (studentId: string) => api.get(`/fingerprints/${studentId}`),
  upload: (data: { studentId: string; fingerPosition: string; fingerType: string; imageData: string }) =>
    api.post('/fingerprints/upload', data),
  delete: (id: string) => api.delete(`/fingerprints/${id}`),
  downloadUrl: (studentId: string) => `${API_URL}/fingerprints/download/${studentId}`,
};

export const documentAPI = {
  list: (studentId: string) => api.get(`/documents/${studentId}`),
  upload: (studentId: string, formData: FormData) =>
    api.post(`/documents/${studentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadUrl: (docId: string) => `${API_URL}/documents/download/${docId}`,
  delete: (docId: string) => api.delete(`/documents/${docId}`),
};

export default api;

