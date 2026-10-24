import { auditService } from '../services/audit.service.js';
import { userService } from '../services/user.service.js';
import { z } from 'zod';
import { createUserSchema, resetPasswordSchema, statusSchema, updateUserSchema, userListSchema } from '../validators/user.validator.js';

const auditContext = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const auditUser = (user) => ({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, roles: user.roles, departments:user.departments, status:user.status, isActive: user.isActive });
const userInput = (body) => Object.fromEntries(Object.entries({ firstName: body.firstName ?? body.first_name, lastName: body.lastName ?? body.last_name, email: body.email, phone: body.phone, password: body.password, roleIds:body.roleIds,departmentIds:body.departmentIds,status:body.status }).filter(([, value]) => value !== undefined));

export const userController = {
  async list(req, res) { res.json({ success: true, message: 'Users retrieved', data: await userService.list(userListSchema.parse(req.query)) }); },
  async get(req, res) { res.json({ success: true, message: 'User retrieved', data: await userService.get(req.params.id) }); },
  async create(req, res) {
    const user = await userService.create(createUserSchema.parse(userInput(req.body)),req.user.id);
    await auditService.record({ userId: req.user.id, action: 'USER_CREATED', entity: 'USER', entityId: user.id, newData: auditUser(user), ...auditContext(req) });
    res.status(201).json({ success: true, message: 'User created', data: user });
  },
  async update(req, res) {
    const changes = updateUserSchema.parse(userInput(req.body));
    const { previous, user } = await userService.update(req.params.id, changes);
    await auditService.record({ userId: req.user.id, action: 'USER_UPDATED', entity: 'USER', entityId: user.id, oldData: auditUser(previous), newData: auditUser(user), ...auditContext(req) });
    res.json({ success: true, message: 'User updated', data: user });
  },
  async status(req, res) {
    const { status } = statusSchema.parse(req.body);
    const { previous, user } = await userService.setStatus(req.params.id, status, req.user.id);
    await auditService.record({ userId: req.user.id, action: `USER_${status}`, entity: 'USER', entityId: user.id, oldData: auditUser(previous), newData: auditUser(user), ...auditContext(req) });
    res.json({ success: true, message: 'User status updated', data: user });
  },
  async resetPassword(req, res) { const user = await userService.resetPassword(req.params.id, resetPasswordSchema.parse(req.body).password); await auditService.record({ userId: req.user.id, action: 'USER_PASSWORD_RESET', entity: 'USER', entityId: user.id, ...auditContext(req) }); res.json({ success: true, message: 'Password reset successfully', data: user }); },
  async roles(req,res){const {roleIds}=z.object({roleIds:z.array(z.string().min(1)).min(1).max(20)}).parse(req.body);const user=await userService.setRoles(req.params.id,roleIds,req.user.id);await auditService.record({userId:req.user.id,action:'USER_ROLES_UPDATED',entity:'USER',entityId:user.id,newData:{roles:user.roles},...auditContext(req)});res.json({success:true,message:'User roles updated.',data:user});},
  async departments(req,res){const {departmentIds}=z.object({departmentIds:z.array(z.coerce.number().int().positive()).max(100)}).parse(req.body);const user=await userService.setDepartments(req.params.id,departmentIds);await auditService.record({userId:req.user.id,action:'USER_DEPARTMENTS_UPDATED',entity:'USER',entityId:user.id,newData:{departments:user.departments},...auditContext(req)});res.json({success:true,message:'User departments updated.',data:user});},
};
