import axios from 'axios';
import type { PaymentPlan, PaymentSession } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('nexus-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const payments = {
  getPlans: () => api.get<PaymentPlan[]>('/payments/plans'),
  getBalance: () => api.get<{ balance: number }>('/payments/balance'),
  create: (planId: string) => api.post<PaymentSession>('/payments/create', { planId }),
  confirm: (paymentId: string) => api.post<{ ok: boolean; balance: number }>('/payments/confirm', { paymentId }),
  getStatus: (paymentId: string) => api.get<{ status: string; mercadoPagoStatus?: string; amount: number; createdAt: string }>(`/payments/status/${paymentId}`),
};

export default api;
