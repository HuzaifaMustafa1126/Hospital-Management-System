import { z } from 'zod';
import { auditService } from '../services/audit.service.js';
import { settingsService } from '../services/settings.service.js';
const input = z.object({ amount: z.coerce.number().finite().positive() });
const context = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
export const settingsController = {
  async getRegistrationFee(_req, res) { res.json({ success: true, data: await settingsService.getRegistrationFee() }); },
  async updateRegistrationFee(req, res) { const previous = await settingsService.getRegistrationFee(); const fee = await settingsService.updateRegistrationFee(input.parse(req.body).amount); await auditService.record({ userId: req.user.id, action: 'REGISTRATION_FEE_UPDATED', entity: 'SETTING', entityId: 'REGISTRATION_FEE', oldData: previous, newData: fee, ...context(req) }); res.json({ success: true, message: 'Registration fee updated', data: fee }); },
};
