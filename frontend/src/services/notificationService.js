import api from './api';

export const getMyNotifications = (params) =>
  api.get('/notifications', { params });

export const getUnreadCount = () =>
  api.get('/notifications').then((r) => ({ data: { count: r.data.unreadCount || 0 } }));

export const markAsRead = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllAsRead = () =>
  api.patch('/notifications/mark-all-read');

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`);

// Admin only
export const sendNotification = (payload) =>
  api.post('/notifications/send', payload);
