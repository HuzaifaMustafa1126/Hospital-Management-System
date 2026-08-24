import { billingService } from "../services/billing.service.js";
import {
  billingListSchema,
  paymentSchema,
  printEventSchema,
} from "../validators/billing.validator.js";
export const billingController = {
  async list(req, res) {
    res.json({
      success: true,
      data: await billingService.list(billingListSchema.parse(req.query)),
    });
  },
  async get(req, res) {
    res.json({ success: true, data: await billingService.get(req.params.id) });
  },
  async printable(req, res) {
    res.json({
      success: true,
      data: await billingService.getPrintable(req.params.id),
    });
  },
  async paymentReceipt(req, res) {
    res.json({
      success: true,
      data: await billingService.getPaymentReceipt(
        req.params.id,
        req.params.paymentNumber,
      ),
    });
  },
  async recordPrint(req, res) {
    res.status(201).json({
      success: true,
      message: "Print action recorded.",
      data: await billingService.recordPrint(
        req.params.id,
        printEventSchema.parse(req.body),
        req.user,
      ),
    });
  },
  async byVisit(req, res) {
    res.json({
      success: true,
      data: await billingService.getByVisit(req.params.visitId),
    });
  },
  async addPayment(req, res) {
    res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: await billingService.addPayment(
        req.params.id,
        paymentSchema.parse(req.body),
        req.user,
      ),
    });
  },
};
