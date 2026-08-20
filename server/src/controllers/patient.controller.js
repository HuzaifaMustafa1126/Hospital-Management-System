import { auditService } from '../services/audit.service.js';
import { patientService } from '../services/patient.service.js';
import { patientListSchema, patientSchema, patientUpdateSchema } from '../validators/patient.validator.js';
const context = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const patientInput = (body) => Object.fromEntries(Object.entries({
  firstName: body.firstName ?? body.first_name, lastName: body.lastName ?? body.last_name,
  fatherName: body.fatherName ?? body.father_name, cnic: body.cnic, phone: body.phone,
  address: body.address, doctorId: body.doctorId ?? body.doctor_id,
  paymentMethod: body.paymentMethod ?? body.payment_method,
}).filter(([, value]) => value !== undefined));
export const patientController = {
  async create(req, res) { const registration = await patientService.create(patientSchema.parse(patientInput(req.body)), req.user.id); res.status(201).json({ success: true, message: 'Patient registered successfully', data: registration }); },
  async list(req, res) { res.json({ success: true, message: 'Patients retrieved', data: await patientService.list(patientListSchema.parse(req.query)) }); },
  async search(req, res) { const value = req.query.cnic || req.query.patientNumber || req.query.phone || req.query.name || req.query.search; if (!value?.trim()) return res.status(400).json({ success: false, message: 'Provide a CNIC, patient number, phone, or name to search', errors: [] }); res.json({ success: true, message: 'Patients retrieved', data: await patientService.search(value) }); },
  async get(req, res) { res.json({ success: true, message: 'Patient retrieved', data: await patientService.get(req.params.id) }); },
  async update(req, res) { const { previous, patient } = await patientService.update(req.params.id, patientUpdateSchema.parse(patientInput(req.body)), req.user.id); await auditService.record({ userId: req.user.id, action: 'PATIENT_UPDATED', entity: 'PATIENT', entityId: String(patient.id), oldData: previous, newData: patient, ...context(req) }); res.json({ success: true, message: 'Patient updated', data: patient }); },
  async remove(req, res) { const patient = await patientService.remove(req.params.id); await auditService.record({ userId: req.user.id, action: 'PATIENT_DELETED', entity: 'PATIENT', entityId: String(patient.id), ...context(req) }); res.json({ success: true, message: 'Patient deactivated', data: patient }); },
};
