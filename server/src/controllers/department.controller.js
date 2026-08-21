import { auditService } from '../services/audit.service.js';
import { departmentService } from '../services/department.service.js';
import { departmentCreateSchema, departmentListSchema, departmentStatusSchema, departmentUpdateSchema } from '../validators/department.validator.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip, userAgent: req.get('user-agent') });
export const departmentController = {
  async list(req, res) { res.json({ success: true, data: await departmentService.list(departmentListSchema.parse(req.query)) }); },
  async get(req, res) { res.json({ success: true, data: await departmentService.get(req.params.id) }); },
  async create(req, res) { const department = await departmentService.create(departmentCreateSchema.parse(req.body), req.user.id); await auditService.record({ ...auditContext(req), action: 'DEPARTMENT_CREATED', entity: 'DEPARTMENT', entityId: String(department.id), newData: department }); res.status(201).json({ success: true, message: 'Department created.', data: department }); },
  async update(req, res) { const { old, department } = await departmentService.update(req.params.id, departmentUpdateSchema.parse(req.body)); await auditService.record({ ...auditContext(req), action: 'DEPARTMENT_UPDATED', entity: 'DEPARTMENT', entityId: String(department.id), oldData: old, newData: department }); res.json({ success: true, message: 'Department updated.', data: department }); },
  async status(req, res) { const { isActive } = departmentStatusSchema.parse(req.body); const { old, department } = await departmentService.setStatus(req.params.id, isActive); await auditService.record({ ...auditContext(req), action: isActive ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED', entity: 'DEPARTMENT', entityId: String(department.id), oldData: old, newData: department }); res.json({ success: true, message: `Department ${isActive ? 'activated' : 'deactivated'}.`, data: department }); },
};
