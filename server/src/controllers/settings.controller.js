import { z } from "zod";
import { auditService } from "../services/audit.service.js";
import { settingsService } from "../services/settings.service.js";
const input = z.object({ amount: z.coerce.number().finite().positive() });
const hospitalInput = z.object({
  name: z.string().trim().min(1).max(200),
  shortName: z.string().trim().min(1).max(30),
  logoUrl: z.string().trim().max(60000).default(""),
  address: z.string().trim().min(1).max(500),
  phone: z.string().trim().min(1).max(50),
  alternatePhone: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(200),
  website: z
    .union([z.literal(""), z.string().trim().url().max(300)])
    .default(""),
  taxNumber: z.string().trim().max(100).default(""),
  registrationNumber: z.string().trim().max(100).default(""),
  footerMessage: z.string().trim().min(1).max(1000),
  currency: z.string().trim().min(1).max(10),
  invoicePrefix: z.string().trim().min(1).max(20),
  receiptPrefix: z.string().trim().min(1).max(20),
});
const context = (req) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});
export const settingsController = {
  async getRegistrationFee(_req, res) {
    res.json({
      success: true,
      data: await settingsService.getRegistrationFee(),
    });
  },
  async updateRegistrationFee(req, res) {
    const previous = await settingsService.getRegistrationFee();
    const fee = await settingsService.updateRegistrationFee(
      input.parse(req.body).amount,
    );
    await auditService.record({
      userId: req.user.id,
      action: "REGISTRATION_FEE_UPDATED",
      entity: "SETTING",
      entityId: "REGISTRATION_FEE",
      oldData: previous,
      newData: fee,
      ...context(req),
    });
    res.json({ success: true, message: "Registration fee updated", data: fee });
  },
  async getHospital(_req, res) {
    res.json({ success: true, data: await settingsService.getHospital() });
  },
  async updateHospital(req, res) {
    const previous = await settingsService.getHospital();
    const hospital = await settingsService.updateHospital(
      hospitalInput.parse(req.body),
    );
    await auditService.record({
      userId: req.user.id,
      action: "HOSPITAL_SETTINGS_UPDATED",
      entity: "SETTING",
      entityId: "HOSPITAL",
      details: `${req.user.firstName} ${req.user.lastName} updated hospital invoice and receipt branding settings.`,
      oldData: previous,
      newData: hospital,
      ...context(req),
    });
    res.json({
      success: true,
      message: "Hospital settings updated.",
      data: hospital,
    });
  },
};
