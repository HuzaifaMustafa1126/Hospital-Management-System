import { dashboardService } from '../services/dashboard.service.js';
export const dashboardController = {
  async summary(req, res) {
    const requestedDays = Number(req.query.days);
    const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 30;
    res.json({ success: true, data: await dashboardService.summary({ includeFinancial: req.user.permissions.includes("REVENUE_VIEW"), days }) });
  },
  async financial(req, res) { const data = await dashboardService.summary({ includeFinancial: true }); res.json({ success: true, data: data.financial }); },
};
