import { labCatalogService } from "../services/lab-catalog.service.js";
import {
  labCatalogIdSchema,
  labCategoryListSchema,
  labCombinationListSchema,
  labPriceListSchema,
  labProfileListSchema,
  labTestListSchema,
  labCategoryCreateSchema,
  labCategoryUpdateSchema,
  labCategoryStatusSchema,
  labTestCreateSchema,
  labTestUpdateSchema,
  labTestStatusSchema,
  labParameterCreateSchema,
  labParameterUpdateSchema,
  labParameterStatusSchema,
  labProfileCreateSchema,
  labProfileUpdateSchema,
  labProfileStatusSchema,
  labProfileTestsSchema,
  labCombinationCreateSchema,
  labCombinationUpdateSchema,
  labCombinationStatusSchema,
  labCombinationItemsSchema,
  labPriceCreateSchema,
  labPriceReplacementSchema,
  labPriceUpdateSchema,
  labPriceStatusSchema,
  labEffectivePriceSchema,
} from "../validators/lab-catalog.validator.js";

const auditContext = (req) => ({
  userId: req.user.id,
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

export const labCatalogController = {
  async categories(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.categories(
        labCategoryListSchema.parse(req.query),
      ),
    });
  },
  async tests(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.tests(labTestListSchema.parse(req.query)),
    });
  },
  async test(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.test(
        labCatalogIdSchema.parse(req.params.id),
      ),
    });
  },
  async profiles(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.profiles(
        labProfileListSchema.parse(req.query),
      ),
    });
  },
  async profile(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.profile(
        labCatalogIdSchema.parse(req.params.id),
      ),
    });
  },
  async combinations(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.combinations(
        labCombinationListSchema.parse(req.query),
      ),
    });
  },
  async prices(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.prices(labPriceListSchema.parse(req.query)),
    });
  },
  async createCategory(req, res) {
    const data = await labCatalogService.createCategory(
      labCategoryCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({ success: true, message: "Laboratory category created.", data });
  },
  async updateCategory(req, res) {
    const { record } = await labCatalogService.updateCategory(
      labCatalogIdSchema.parse(req.params.id),
      labCategoryUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory category updated.",
      data: record,
    });
  },
  async categoryStatus(req, res) {
    const { isActive } = labCategoryStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setCategoryStatus(
      labCatalogIdSchema.parse(req.params.id),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory category ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async createTest(req, res) {
    const data = await labCatalogService.createTest(
      labTestCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({ success: true, message: "Laboratory test created.", data });
  },
  async updateTest(req, res) {
    const { record } = await labCatalogService.updateTest(
      labCatalogIdSchema.parse(req.params.id),
      labTestUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory test updated.",
      data: record,
    });
  },
  async testStatus(req, res) {
    const { isActive } = labTestStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setTestStatus(
      labCatalogIdSchema.parse(req.params.id),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory test ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async createParameter(req, res) {
    const data = await labCatalogService.createParameter(
      labCatalogIdSchema.parse(req.params.id),
      labParameterCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Laboratory test parameter created.",
        data,
      });
  },
  async updateParameter(req, res) {
    const { record } = await labCatalogService.updateParameter(
      labCatalogIdSchema.parse(req.params.id),
      labCatalogIdSchema.parse(req.params.parameterId),
      labParameterUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory test parameter updated.",
      data: record,
    });
  },
  async parameterStatus(req, res) {
    const { isActive } = labParameterStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setParameterStatus(
      labCatalogIdSchema.parse(req.params.id),
      labCatalogIdSchema.parse(req.params.parameterId),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory test parameter ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async createProfile(req, res) {
    const data = await labCatalogService.createProfile(
      labProfileCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({ success: true, message: "Laboratory profile created.", data });
  },
  async updateProfile(req, res) {
    const { record } = await labCatalogService.updateProfile(
      labCatalogIdSchema.parse(req.params.id),
      labProfileUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory profile updated.",
      data: record,
    });
  },
  async profileStatus(req, res) {
    const { isActive } = labProfileStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setProfileStatus(
      labCatalogIdSchema.parse(req.params.id),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory profile ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async profileTests(req, res) {
    const { testIds } = labProfileTestsSchema.parse(req.body);
    const { record } = await labCatalogService.setProfileTests(
      labCatalogIdSchema.parse(req.params.id),
      testIds,
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory profile tests updated.",
      data: record,
    });
  },
  async createCombination(req, res) {
    const data = await labCatalogService.createCombination(
      labCombinationCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Laboratory combination created.",
        data,
      });
  },
  async updateCombination(req, res) {
    const { record } = await labCatalogService.updateCombination(
      labCatalogIdSchema.parse(req.params.id),
      labCombinationUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory combination updated.",
      data: record,
    });
  },
  async combinationStatus(req, res) {
    const { isActive } = labCombinationStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setCombinationStatus(
      labCatalogIdSchema.parse(req.params.id),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory combination ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async combinationItems(req, res) {
    const { items } = labCombinationItemsSchema.parse(req.body);
    const { record } = await labCatalogService.setCombinationItems(
      labCatalogIdSchema.parse(req.params.id),
      items,
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory combination items updated.",
      data: record,
    });
  },
  async createPrice(req, res) {
    const data = await labCatalogService.createPrice(
      labPriceCreateSchema.parse(req.body),
      auditContext(req),
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Laboratory price configuration created.",
        data,
      });
  },
  async replaceEffectivePrice(req, res) {
    const data = await labCatalogService.replaceEffectivePrice(
      labPriceReplacementSchema.parse(req.body),
      auditContext(req),
    );
    res.status(201).json({
      success: true,
      message: "Laboratory price replaced and previous history preserved.",
      data,
    });
  },
  async updatePrice(req, res) {
    const { record } = await labCatalogService.updatePrice(
      labCatalogIdSchema.parse(req.params.id),
      labPriceUpdateSchema.parse(req.body),
      auditContext(req),
    );
    res.json({
      success: true,
      message: "Laboratory price configuration updated.",
      data: record,
    });
  },
  async priceStatus(req, res) {
    const { isActive } = labPriceStatusSchema.parse(req.body);
    const { record } = await labCatalogService.setPriceStatus(
      labCatalogIdSchema.parse(req.params.id),
      isActive,
      auditContext(req),
    );
    res.json({
      success: true,
      message: `Laboratory price configuration ${isActive ? "activated" : "deactivated"}.`,
      data: record,
    });
  },
  async effectivePrice(req, res) {
    res.json({
      success: true,
      data: await labCatalogService.effectivePrice(
        labEffectivePriceSchema.parse(req.query),
      ),
    });
  },
};
