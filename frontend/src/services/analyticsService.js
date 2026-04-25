import api from './api';
export const getSchoolAnalytics  = (p) => api.get('/analytics/school', { params: p });
export const getClassAnalytics   = (id, p) => api.get(`/analytics/class/${id}`, { params: p });
export const getStudentAnalytics = (id) => api.get(`/analytics/student/${id}`);
export const getPaymentAnalytics = (p) => api.get('/analytics/payments', { params: p });