import api from './api';

export const sendMessage     = (d) => api.post('/messages', d);       // d = { receiverId, content, subject? }
export const broadcast       = (d) => api.post('/messages/broadcast', d); // d = { targetRole, content, subject? }
export const getInbox        = (p) => api.get('/messages/inbox', { params: p });
export const getSent         = (p) => api.get('/messages/sent',  { params: p });
export const getContacts     = () => api.get('/messages/contacts');
export const getConversation = (id, p) => api.get(`/messages/conversation/${id}`, { params: p });
export const getUnreadCount  = () => api.get('/messages/unread-count');
export const markAllAsRead   = () => api.patch('/messages/mark-all-read');
export const markAsRead      = (id) => api.patch(`/messages/${id}/read`);
export const deleteMessage   = (id) => api.delete(`/messages/${id}`);

// Get messageable users for the new conversation picker
export const getDirectory = (params) => api.get('/users/directory', { params });
