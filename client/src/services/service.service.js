import { api } from './api';
export const serviceService = { list: (params) => api.get('/services', { params }), get: (id) => api.get(`/services/${id}`), create: (data) => api.post('/services', data), update: (id, data) => api.patch(`/services/${id}`, data), status: (id, isActive) => api.patch(`/services/${id}/status`, { isActive }) };
