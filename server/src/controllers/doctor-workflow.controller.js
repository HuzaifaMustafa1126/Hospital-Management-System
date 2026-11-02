import { doctorWorkflowService } from "../services/doctor-workflow.service.js";
import { shortStayOrderSchema } from "../validators/visit.validator.js";
export const doctorWorkflowController = {
  async availableServices(req,res){res.json({success:true,data:await doctorWorkflowService.availableServices(req.params.id,req.user.id)});},
  async details(req,res) { res.json({success:true,data:await doctorWorkflowService.details(req.params.id,req.user.id)}); },
  async queue(req,res) { res.json({ success:true, data:await doctorWorkflowService.queue(req.user.id,req.query.search || '') }); },
  async claim(req,res) { res.json({ success:true, message:'Visit claimed.', data:await doctorWorkflowService.claim(req.params.id,req.user.id) }); },
  async orders(req,res) { res.json({ success:true, data:await doctorWorkflowService.orders(req.params.id,req.user.id) }); },
  async addOrder(req,res) {
    const isBulk = Array.isArray(req.body?.orders);
    const orders = shortStayOrderSchema.parse(req.body);
    const created = await doctorWorkflowService.addShortStay(req.params.id,orders,req.user.id);
    res.status(201).json({ success:true, message:orders.length === 1 ? 'Short-stay order created.' : 'Short-stay orders created.', data:isBulk ? created : created[0] });
  },
};
