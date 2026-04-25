import api from './api';
export const getAllPayments     = (p) => api.get('/payments', { params: p });
export const getStudentPayments= (id, p) => api.get(`/payments/student/${id}`, { params: p });
export const recordManual      = (d) => api.post('/payments/manual', d);
export const initializePayment = (d) => api.post('/payments/initialize', d);
export const getReceipt        = (id) => api.get(`/payments/${id}/receipt`);