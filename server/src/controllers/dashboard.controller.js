import { dashboardService } from '../services/dashboard.service.js';
export const dashboardController = {
  async summary(req, res) { res.json({ success: true, data: await dashboardService.summary({ includeFinancial: req.user.permissions.includes("REVENUE_VIEW") }) }); },
  async financial(req, res) { const data = await dashboardService.summary({ includeFinancial: true }); res.json({ success: true, data: data.financial }); },
};
