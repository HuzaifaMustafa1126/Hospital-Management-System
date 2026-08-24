import { surgeryService } from "../services/surgery.service.js";
import { laboratorySearchSchema, laboratoryServiceSchema } from "../validators/laboratory.validator.js";
export const surgeryController = {
  async overview(_req, res) {
    res.json({ success: true, data: await surgeryService.overview() });
  },
  async search(req, res) { res.json({ success: true, data: await surgeryService.search(laboratorySearchSchema.parse(req.query)) }); },
  async getPatient(req, res) { res.json({ success: true, data: await surgeryService.getPatient(req.params.id) }); },
  async services(_req, res) { res.json({ success: true, data: await surgeryService.availableServices() }); },
  async patientServices(req, res) { res.json({ success: true, data: await surgeryService.patientServices(req.params.id) }); },
  async addService(req, res) { const service = await surgeryService.addService(req.params.patientId, laboratoryServiceSchema.parse(req.body), req.user); res.status(201).json({ success: true, message: "Surgery service added successfully.", data: service }); },
};
