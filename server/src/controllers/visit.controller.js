import { visitService } from "../services/visit.service.js";
import { visitCreateSchema } from "../validators/visit.validator.js";
export const visitController = {
  async list(req, res) {
    res.json({ success: true, data: await visitService.list(req.params.id) });
  },
  async create(req, res) {
    res
      .status(201)
      .json({
        success: true,
        message: "New visit created.",
        data: await visitService.create(
          req.params.id,
          visitCreateSchema.parse(req.body),
          req.user.id,
        ),
      });
  },
  async get(req, res) {
    res.json({ success: true, data: await visitService.get(req.params.id) });
  },
};
