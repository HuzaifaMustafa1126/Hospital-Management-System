import { doctorWorkflowService } from "../services/doctor-workflow.service.js";
import { shortStayOrderSchema } from "../validators/visit.validator.js";
export const doctorWorkflowController = {
  async details(req,res) { res.json({success:true,data:await doctorWorkflowService.details(req.params.id,req.user.id)}); },
  async queue(req,res) { res.json({ success:true, data:await doctorWorkflowService.queue(req.user.id,req.query.search || '') }); },
  async claim(req,res) { res.json({ success:true, message:'Visit claimed.', data:await doctorWorkflowService.claim(req.params.id,req.user.id) }); },
  async orders(req,res) { res.json({ success:true, data:await doctorWorkflowService.orders(req.params.id,req.user.id) }); },
  async addOrder(req,res) { res.status(201).json({ success:true, message:'Short-stay order created.', data:await doctorWorkflowService.addShortStay(req.params.id,shortStayOrderSchema.parse(req.body),req.user.id) }); },
};
