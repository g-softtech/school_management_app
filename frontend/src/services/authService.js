import api from './api';

export const loginUser      = (data) => api.post('/auth/login', data);
export const logoutUser     = ()     => api.post('/auth/logout');
export const getMe          = ()     => api.get('/auth/me');
export const updatePassword = (data) => api.patch('/auth/update-password', data);