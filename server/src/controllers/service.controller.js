import { auditService } from '../services/audit.service.js';
import { serviceService } from '../services/service.service.js';
import { serviceCreateSchema, serviceListSchema, serviceStatusSchema, serviceUpdateSchema } from '../validators/service.validator.js';
import { AppError } from '../utils/app-error.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip, userAgent: req.get('user-agent') });
export const serviceController = {
  async list(req, res) { res.json({ success: true, data: await serviceService.list(serviceListSchema.parse(req.query)) }); },
  async analytics(req, res) { res.json({ success: true, data: await serviceService.analytics(req.query.range) }); },
  async get(req, res) { res.json({ success: true, data: await serviceService.get(req.params.id) }); },
  async create(req, res) { const service = await serviceService.create(serviceCreateSchema.parse(req.body), req.user.id); await auditService.record({ ...auditContext(req), action: 'SERVICE_CREATED', entity: 'SERVICE', entityId: String(service.id), newData: service }); res.status(201).json({ success: true, message: 'Service created.', data: service }); },
  async update(req, res) { if(Object.hasOwn(req.body,'price')&&!req.user.permissions.includes('SERVICE_MANAGE_PRICING'))throw new AppError(403,'You do not have permission to manage service pricing.');if(Object.hasOwn(req.body,'departmentIds')&&!req.user.permissions.includes('SERVICE_ASSIGN_DEPARTMENTS'))throw new AppError(403,'You do not have permission to assign service departments.');const { old, service } = await serviceService.update(req.params.id, serviceUpdateSchema.parse(req.body)); await auditService.record({ ...auditContext(req), action: Object.hasOwn(req.body, 'price') ? 'SERVICE_PRICE_CHANGED' : 'SERVICE_UPDATED', entity: 'SERVICE', entityId: String(service.id), oldData: old, newData: service }); res.json({ success: true, message: 'Service updated.', data: service }); },
  async status(req, res) { const { isActive } = serviceStatusSchema.parse(req.body); const { old, service } = await serviceService.setStatus(req.params.id, isActive); await auditService.record({ ...auditContext(req), action: isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED', entity: 'SERVICE', entityId: String(service.id), oldData: old, newData: service }); res.json({ success: true, message: `Service ${isActive ? 'activated' : 'deactivated'}.`, data: service }); },
  async deletionImpact(req,res){res.json({success:true,data:await serviceService.deletionImpact(req.params.id)});},
  async remove(req,res){const service=await serviceService.remove(req.params.id);await auditService.record({...auditContext(req),action:'SERVICE_DELETED',entity:'SERVICE',entityId:String(service.id),oldData:service});res.json({success:true,message:'Service permanently deleted.',data:service});},
};
