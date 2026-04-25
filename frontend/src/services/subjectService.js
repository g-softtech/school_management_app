import api from './api';
export const getSubjects    = (p) => api.get('/subjects', { params: p });
export const createSubject  = (d) => api.post('/subjects', d);
export const updateSubject  = (id, d) => api.patch(`/subjects/${id}`, d);
export const assignTeacher  = (id, d) => api.patch(`/subjects/${id}/assign-teacher`, d);
export const deleteSubject  = (id) => api.delete(`/subjects/${id}`);