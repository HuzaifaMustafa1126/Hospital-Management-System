import { api } from './api';
export const dashboardService = { summary: () => api.get('/dashboard/summary') };
