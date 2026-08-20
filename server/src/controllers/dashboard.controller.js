import { dashboardService } from '../services/dashboard.service.js';
export const dashboardController = { async summary(_req, res) { res.json({ success: true, data: await dashboardService.summary() }); } };
