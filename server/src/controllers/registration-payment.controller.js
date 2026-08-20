import { z } from 'zod';
import { registrationPaymentService } from '../services/registration-payment.service.js';
const listInput = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(191).optional(), from: z.string().date().optional(), to: z.string().date().optional() });
export const registrationPaymentController = { async list(req, res) { res.json({ success: true, data: await registrationPaymentService.list(listInput.parse(req.query)) }); }, async get(req, res) { res.json({ success: true, data: await registrationPaymentService.get(req.params.id) }); } };
