import { auditService } from '../services/audit.service.js';
import { serviceService } from '../services/service.service.js';
import { serviceCreateSchema, serviceListSchema, serviceStatusSchema, serviceUpdateSchema } from '../validators/service.validator.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip, userAgent: req.get('user-agent') });
export const serviceController = {
  async list(req, res) { res.json({ success: true, data: await serviceService.list(serviceListSchema.parse(req.query)) }); },
  async analytics(req, res) { res.json({ success: true, data: await serviceService.analytics(req.query.range) }); },
  async get(req, res) { res.json({ success: true, data: await serviceService.get(req.params.id) }); },
  async create(req, res) { const service = await serviceService.create(serviceCreateSchema.parse(req.body), req.user.id); await auditService.record({ ...auditContext(req), action: 'SERVICE_CREATED', entity: 'SERVICE', entityId: String(service.id), newData: service }); res.status(201).json({ success: true, message: 'Service created.', data: service }); },
  async update(req, res) { const { old, service } = await serviceService.update(req.params.id, serviceUpdateSchema.parse(req.body)); await auditService.record({ ...auditContext(req), action: Object.hasOwn(req.body, 'price') ? 'SERVICE_PRICE_CHANGED' : 'SERVICE_UPDATED', entity: 'SERVICE', entityId: String(service.id), oldData: old, newData: service }); res.json({ success: true, message: 'Service updated.', data: service }); },
  async status(req, res) { const { isActive } = serviceStatusSchema.parse(req.body); const { old, service } = await serviceService.setStatus(req.params.id, isActive); await auditService.record({ ...auditContext(req), action: isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED', entity: 'SERVICE', entityId: String(service.id), oldData: old, newData: service }); res.json({ success: true, message: `Service ${isActive ? 'activated' : 'deactivated'}.`, data: service }); },
};
