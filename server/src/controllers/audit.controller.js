import { auditService } from '../services/audit.service.js';

export const auditController = {
  async list(_req, res) {
    res.json({ success: true, message: 'Audit logs retrieved', data: await auditService.list() });
  },
};
