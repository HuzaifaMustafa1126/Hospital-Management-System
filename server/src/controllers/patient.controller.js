import { auditService } from '../services/audit.service.js';
import { patientService } from '../services/patient.service.js';
import { patientClassificationSchema, patientListSchema, patientPermanentDeleteSchema, patientSchema, patientUpdateSchema } from '../validators/patient.validator.js';
const context = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });
const patientInput = (body) => Object.fromEntries(Object.entries({
  firstName: body.firstName ?? body.first_name, lastName: body.lastName ?? body.last_name,
  fatherName: body.fatherName ?? body.father_name, gender: body.gender, age:body.age, cnic: body.cnic, phone: body.phone,
  address: body.address, departmentId: body.departmentId ?? body.department_id,
      paymentMethod: body.paymentMethod ?? body.payment_method,
      feeType: body.feeType ?? body.fee_type, registrationFee: body.registrationFee ?? body.registration_fee,
}).filter(([, value]) => value !== undefined));
export const patientController = {
  async create(req, res) { const registration = await patientService.create(patientSchema.parse(patientInput(req.body)), req.user.id); res.status(201).json({ success: true, message: 'Patient registered successfully', data: registration }); },
  async list(req, res) { res.json({ success: true, message: 'Patients retrieved', data: await patientService.list(patientListSchema.parse(req.query)) }); },
  async search(req, res) { const value = req.query.cnic || req.query.patientNumber || req.query.phone || req.query.name || req.query.search; if (!value?.trim()) return res.status(400).json({ success: false, message: 'Provide a CNIC, patient number, phone, or name to search', errors: [] }); res.json({ success: true, message: 'Patients retrieved', data: await patientService.search(value) }); },
  async checkCnic(req, res) { res.json({ success: true, data: await patientService.checkDuplicate('cnic', req.query.cnic) }); },
  async checkPhone(req, res) { res.json({ success: true, data: await patientService.checkDuplicate('phone', req.query.phone) }); },
  async get(req, res) { res.json({ success: true, message: 'Patient retrieved', data: await patientService.get(req.params.id) }); },
  async update(req, res) { const { previous, patient } = await patientService.update(req.params.id, patientUpdateSchema.parse(patientInput(req.body)), req.user.id); await auditService.record({ userId: req.user.id, action: 'PATIENT_UPDATED', entity: 'PATIENT', entityId: String(patient.id), oldData: previous, newData: patient, ...context(req) }); res.json({ success: true, message: 'Patient updated', data: patient }); },
  async deletionImpact(req, res) { res.json({ success: true, message: 'Patient deletion impact retrieved', data: await patientService.deletionImpact(req.params.id) }); },
  async classify(req, res) {
    const patient = await patientService.classify(req.params.id, patientClassificationSchema.parse(req.body), req.user.id);
    res.json({ success: true, message: `Patient classified as ${patient.recordClassification}`, data: patient });
  },
  async permanentDelete(req, res) {
    const input = patientPermanentDeleteSchema.parse(req.body);
    try {
      const result = await patientService.permanentDelete(req.params.id, input, req.user.id);
      res.json({ success: true, message: 'Patient permanently deleted', data: result });
    } catch (error) {
      const impact = error.errors?.[0]?.impact;
      await auditService.record({ userId: req.user.id, action: 'PATIENT_PERMANENT_DELETE_BLOCKED', entity: 'PATIENT', entityId: String(req.params.id), details: `Permanent deletion of patient record #${req.params.id} was blocked: ${error.message}`, newData: { result: 'BLOCKED', categories: impact?.counts || null }, ...context(req) });
      throw error;
    }
  },
};
