import { auditService } from '../services/audit.service.js';
import { userService } from '../services/user.service.js';
import { createUserSchema, statusSchema, updateUserSchema } from '../validators/user.validator.js';

const auditContext = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const auditUser = (user) => ({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, roles: user.roles, isActive: user.isActive });

export const userController = {
  async list(_req, res) { res.json({ success: true, message: 'Users retrieved', data: await userService.list() }); },
  async get(req, res) { res.json({ success: true, message: 'User retrieved', data: await userService.get(req.params.id) }); },
  async create(req, res) {
    const user = await userService.create(createUserSchema.parse(req.body));
    await auditService.record({ userId: req.user.id, action: 'USER_CREATED', entity: 'USER', entityId: user.id, newData: auditUser(user), ...auditContext(req) });
    res.status(201).json({ success: true, message: 'User created', data: user });
  },
  async update(req, res) {
    const changes = updateUserSchema.parse(req.body);
    const { previous, user } = await userService.update(req.params.id, changes);
    await auditService.record({ userId: req.user.id, action: changes.role ? 'ROLE_CHANGED' : 'USER_UPDATED', entity: 'USER', entityId: user.id, oldData: auditUser(previous), newData: auditUser(user), ...auditContext(req) });
    res.json({ success: true, message: 'User updated', data: user });
  },
  async status(req, res) {
    const { isActive } = statusSchema.parse(req.body);
    const { previous, user } = await userService.setStatus(req.params.id, isActive, req.user.id);
    await auditService.record({ userId: req.user.id, action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entity: 'USER', entityId: user.id, oldData: auditUser(previous), newData: auditUser(user), ...auditContext(req) });
    res.json({ success: true, message: 'User status updated', data: user });
  },
};
