import api from './api';
export const getClasses       = (p) => api.get('/classes', { params: p });
export const getClass         = (id) => api.get(`/classes/${id}`);
export const getClassStudents = (id) => api.get(`/classes/${id}/students`);
export const createClass      = (d) => api.post('/classes', d);
export const updateClass      = (id, d) => api.patch(`/classes/${id}`, d);
export const deleteClass      = (id) => api.delete(`/classes/${id}`);   