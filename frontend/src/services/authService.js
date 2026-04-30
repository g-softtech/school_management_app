import api from './api';

export const loginUser       = (data)  => api.post('/auth/login', data);
export const logoutUser      = ()      => api.post('/auth/logout');
export const getMe           = ()      => api.get('/auth/me');
export const updatePassword  = (data)  => api.patch('/auth/update-password', data);
export const forgotPassword  = (data)  => api.post('/auth/forgot-password', data);
export const resetPassword   = (token, data) => api.patch(`/auth/reset-password/${token}`, data);
export const refreshToken    = ()      => api.post('/auth/refresh');
