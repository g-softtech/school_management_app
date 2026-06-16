import api from './api';

export const getAttendance = (params) => {
  return api.get('/attendance', { params });
};

export const saveAttendance = (data) => {
  return api.post('/attendance', data);
};
