import { doctorService } from '../services/doctor.service.js';
import { doctorSchema, doctorStatusSchema, doctorUpdateSchema } from '../validators/doctor.validator.js';
export const doctorController = {
  async list(req, res) { res.json({ success: true, message: 'Doctors retrieved', data: await doctorService.list({ activeOnly: !req.user.roles.includes('SUPER_ADMIN') }) }); },
  async get(req, res) { res.json({ success: true, message: 'Doctor retrieved', data: await doctorService.get(req.params.id, { activeOnly: !req.user.roles.includes('SUPER_ADMIN') }) }); },
  async create(req, res) { const doctor = await doctorService.create(doctorSchema.parse(req.body)); res.status(201).json({ success: true, message: 'Doctor created', data: doctor }); },
  async update(req, res) { res.json({ success: true, message: 'Doctor updated', data: await doctorService.update(req.params.id, doctorUpdateSchema.parse(req.body)) }); },
  async status(req, res) { const { isActive } = doctorStatusSchema.parse(req.body); res.json({ success: true, message: 'Doctor status updated', data: await doctorService.setStatus(req.params.id, isActive) }); },
};
