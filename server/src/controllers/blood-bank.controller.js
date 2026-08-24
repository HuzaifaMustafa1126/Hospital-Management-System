import { bloodBankService } from "../services/blood-bank.service.js";
import { laboratorySearchSchema, laboratoryServiceSchema } from "../validators/laboratory.validator.js";

export const bloodBankController = {
  async overview(_req, res) { res.json({ success: true, data: await bloodBankService.overview() }); },
  async search(req, res) { res.json({ success: true, data: await bloodBankService.search(laboratorySearchSchema.parse(req.query)) }); },
  async getPatient(req, res) { res.json({ success: true, data: await bloodBankService.getPatient(req.params.id) }); },
  async services(_req, res) { res.json({ success: true, data: await bloodBankService.availableServices() }); },
  async visitServices(req, res) { res.json({ success: true, data: await bloodBankService.visitServices(req.params.visitId) }); },
  async addService(req, res) { const service = await bloodBankService.addService(req.params.visitId, laboratoryServiceSchema.parse(req.body), req.user); res.status(201).json({ success: true, message: "Blood Bank service added successfully.", data: service }); },
};
