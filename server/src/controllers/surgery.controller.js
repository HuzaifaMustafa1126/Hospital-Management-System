import { surgeryService } from "../services/surgery.service.js";
export const surgeryController = {
  async overview(_req, res) {
    res.json({ success: true, data: await surgeryService.overview() });
  },
};
