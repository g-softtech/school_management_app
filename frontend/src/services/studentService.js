import api from './api';
export const getStudents   = (p) => api.get('/students', { params: p });
export const getStudent    = (id) => api.get(`/students/${id}`);
export const createStudent = (d) => api.post('/students', d);
export const updateStudent = (id, d) => api.patch(`/students/${id}`, d);
export const deleteStudent = (id) => api.delete(`/students/${id}`);