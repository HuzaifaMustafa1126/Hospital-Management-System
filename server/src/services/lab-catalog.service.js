import { database } from "../db/database.js";
import { auditService } from "./audit.service.js";
import { AppError } from "../utils/app-error.js";

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: total ? Math.ceil(total / limit) : 0,
});
const activeCondition = (status, column = "is_active") =>
  status === "active"
    ? `${column}=TRUE`
    : status === "inactive"
      ? `${column}=FALSE`
      : null;
const presentPrice = (row) => ({
  ...row,
  priceAmount: row.priceAmount == null ? null : Number(row.priceAmount),
  priceAmountExact: row.priceAmount == null ? null : String(row.priceAmount),
  isActive: Boolean(row.isActive),
  isFree: row.pricingStatus === "CONFIGURED" && Number(row.priceAmount) === 0,
});
const presentTest = (row) => ({
  ...row,
  isOrderable: Boolean(row.isOrderable),
  isActive: Boolean(row.isActive),
});
const presentProfile = (row) => ({
  ...row,
  isOrderable: Boolean(row.isOrderable),
  isActive: Boolean(row.isActive),
});
const presentCategory = (row) => ({
  ...row,
  isActive: Boolean(row.isActive),
  sortOrder: Number(row.sortOrder),
});

const mutationError = (error, entity) => {
  if (error?.code === "ER_DUP_ENTRY")
    return new AppError(409, `${entity} code already exists.`, [], "code");
  if (error?.code === "ER_NO_REFERENCED_ROW_2")
    return new AppError(
      400,
      "The selected laboratory category does not exist.",
      [],
      "categoryId",
    );
  return error;
};

async function categoryById(id, connection = database, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id,code,name,description,is_active AS isActive,sort_order AS sortOrder,created_at AS createdAt,updated_at AS updatedAt FROM lab_categories WHERE id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length) throw new AppError(404, "Laboratory category not found.");
  return presentCategory(rows[0]);
}

async function testById(id, connection = database, lock = false) {
  const [rows] = await connection.execute(
    `SELECT t.id,t.category_id AS categoryId,t.code,t.name,t.description,t.estimated_processing_seconds AS estimatedProcessingSeconds,t.is_orderable AS isOrderable,t.is_active AS isActive,t.created_at AS createdAt,t.updated_at AS updatedAt,c.code AS categoryCode,c.name AS categoryName FROM lab_tests t JOIN lab_categories c ON c.id=t.category_id WHERE t.id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length) throw new AppError(404, "Laboratory test not found.");
  return presentTest(rows[0]);
}

async function validCategory(connection, id) {
  const [rows] = await connection.execute(
    "SELECT id FROM lab_categories WHERE id=?",
    [id],
  );
  if (!rows.length)
    throw new AppError(
      400,
      "The selected laboratory category does not exist.",
      [],
      "categoryId",
    );
}

async function uniqueCode(connection, table, code, excludeId, label) {
  const [rows] = await connection.execute(
    `SELECT id FROM ${table} WHERE code=?${excludeId ? " AND id<>?" : ""}`,
    excludeId ? [code, excludeId] : [code],
  );
  if (rows.length)
    throw new AppError(409, `${label} code already exists.`, [], "code");
}

async function mutate({
  actor,
  action,
  entity,
  entityId,
  oldData,
  newData,
  work,
}) {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const previous = oldData ? await oldData(connection) : null;
    const result = await work(connection);
    const next = newData ? await newData(connection, result) : result;
    await auditService.record({
      ...actor,
      action: typeof action === "function" ? action(next) : action,
      entity,
      entityId: String(entityId ?? next.id),
      oldData: previous,
      newData: next,
      connection,
    });
    await connection.commit();
    return previous ? { old: previous, record: next } : next;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function pricesFor(itemType, ids, connection = database) {
  if (!ids.length) return new Map();
  const column = {
    TEST: "lab_test_id",
    PROFILE: "lab_profile_id",
    COMBINATION: "lab_combination_id",
  }[itemType];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT id,${column} AS targetId,item_type AS itemType,price_amount AS priceAmount,currency,pricing_status AS pricingStatus,effective_from AS effectiveFrom,effective_to AS effectiveTo,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_prices WHERE item_type=? AND ${column} IN (${placeholders}) ORDER BY effective_from DESC,id DESC`,
    [itemType, ...ids],
  );
  const grouped = new Map(ids.map((id) => [Number(id), []]));
  for (const row of rows)
    grouped.get(Number(row.targetId))?.push(presentPrice(row));
  return grouped;
}

async function parametersFor(testIds, connection = database) {
  if (!testIds.length) return new Map();
  const placeholders = testIds.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT id,lab_test_id AS labTestId,code,name,unit,reference_range_text AS referenceRangeText,sort_order AS sortOrder,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_test_parameters WHERE lab_test_id IN (${placeholders}) ORDER BY lab_test_id,sort_order,name`,
    testIds,
  );
  const grouped = new Map(testIds.map((id) => [Number(id), []]));
  for (const row of rows)
    grouped
      .get(Number(row.labTestId))
      ?.push({ ...row, isActive: Boolean(row.isActive) });
  return grouped;
}

const presentParameter = (row) => ({
  ...row,
  sortOrder: Number(row.sortOrder),
  isActive: Boolean(row.isActive),
});

async function parameterById(
  testId,
  parameterId,
  connection = database,
  lock = false,
) {
  const [rows] = await connection.execute(
    `SELECT id,lab_test_id AS labTestId,code,name,unit,reference_range_text AS referenceRangeText,sort_order AS sortOrder,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_test_parameters WHERE id=? AND lab_test_id=?${lock ? " FOR UPDATE" : ""}`,
    [parameterId, testId],
  );
  if (!rows.length)
    throw new AppError(
      404,
      "Laboratory test parameter not found for this test.",
    );
  return presentParameter(rows[0]);
}

async function uniqueParameterCode(connection, testId, code, excludeId) {
  const [rows] = await connection.execute(
    `SELECT id FROM lab_test_parameters WHERE lab_test_id=? AND code=?${excludeId ? " AND id<>?" : ""}`,
    excludeId ? [testId, code, excludeId] : [testId, code],
  );
  if (rows.length)
    throw new AppError(
      409,
      "Parameter code already exists for this laboratory test.",
      [],
      "code",
    );
}

async function profileById(id, connection = database, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id,code,name,description,estimated_processing_seconds AS estimatedProcessingSeconds,is_orderable AS isOrderable,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_profiles WHERE id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length) throw new AppError(404, "Laboratory profile not found.");
  return presentProfile(rows[0]);
}

async function profileDetail(id, connection = database, lock = false) {
  const profile = await profileById(id, connection, lock);
  const [tests] = await connection.execute(
    `SELECT pt.id AS membershipId,pt.sort_order AS sortOrder,t.id,t.category_id AS categoryId,t.code,t.name,t.description,t.estimated_processing_seconds AS estimatedProcessingSeconds,t.is_orderable AS isOrderable,t.is_active AS isActive,c.code AS categoryCode,c.name AS categoryName FROM lab_profile_tests pt JOIN lab_tests t ON t.id=pt.lab_test_id JOIN lab_categories c ON c.id=t.category_id WHERE pt.lab_profile_id=? ORDER BY pt.sort_order,t.name`,
    [id],
  );
  const [parameterMap, testPriceMap, priceMap] = await Promise.all([
    parametersFor(
      tests.map((test) => test.id),
      connection,
    ),
    pricesFor(
      "TEST",
      tests.map((test) => test.id),
      connection,
    ),
    pricesFor("PROFILE", [id], connection),
  ]);
  return {
    ...profile,
    tests: tests.map((test) => ({
      ...presentTest(test),
      sortOrder: Number(test.sortOrder),
      parameters: parameterMap.get(Number(test.id)) || [],
      prices: testPriceMap.get(Number(test.id)) || [],
    })),
    prices: priceMap.get(Number(id)) || [],
  };
}

async function combinationById(id, connection = database, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id,code,name,description,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_combinations WHERE id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length)
    throw new AppError(404, "Laboratory combination not found.");
  return { ...rows[0], isActive: Boolean(rows[0].isActive) };
}

async function combinationDetail(id, connection = database, lock = false) {
  const combination = await combinationById(id, connection, lock);
  const [items] = await connection.execute(
    "SELECT ci.id,ci.item_type AS itemType,ci.lab_test_id AS labTestId,ci.lab_profile_id AS labProfileId,ci.sort_order AS sortOrder,COALESCE(t.code,p.code) code,COALESCE(t.name,p.name) name,COALESCE(t.is_active,p.is_active) AS isActive FROM lab_combination_items ci LEFT JOIN lab_tests t ON t.id=ci.lab_test_id LEFT JOIN lab_profiles p ON p.id=ci.lab_profile_id WHERE ci.lab_combination_id=? ORDER BY ci.sort_order,ci.id",
    [id],
  );
  const priceMap = await pricesFor("COMBINATION", [id], connection);
  return {
    ...combination,
    components: items.map((item) => ({
      ...item,
      sortOrder: Number(item.sortOrder),
      isActive: Boolean(item.isActive),
    })),
    prices: priceMap.get(Number(id)) || [],
  };
}

const priceTargets = {
  TEST: { table: "lab_tests", column: "lab_test_id", label: "Laboratory test" },
  PROFILE: {
    table: "lab_profiles",
    column: "lab_profile_id",
    label: "Laboratory profile",
  },
  COMBINATION: {
    table: "lab_combinations",
    column: "lab_combination_id",
    label: "Laboratory combination",
  },
};

const targetIdFromPrice = (price) =>
  Number(price.labTestId || price.labProfileId || price.labCombinationId);

async function lockPriceTarget(connection, itemType, targetId) {
  const target = priceTargets[itemType];
  const [rows] = await connection.execute(
    `SELECT id FROM ${target.table} WHERE id=? FOR UPDATE`,
    [targetId],
  );
  if (!rows.length)
    throw new AppError(404, `${target.label} not found.`, [], "targetId");
}

async function priceById(id, connection = database, lock = false) {
  const [rows] = await connection.execute(
    `SELECT id,item_type AS itemType,lab_test_id AS labTestId,lab_profile_id AS labProfileId,lab_combination_id AS labCombinationId,price_amount AS priceAmount,currency,pricing_status AS pricingStatus,DATE_FORMAT(effective_from,'%Y-%m-%d %H:%i:%s') AS effectiveFrom,DATE_FORMAT(effective_to,'%Y-%m-%d %H:%i:%s') AS effectiveTo,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_prices WHERE id=?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows.length)
    throw new AppError(404, "Laboratory price configuration not found.");
  return presentPrice(rows[0]);
}

const normalizePrice = (data) => {
  const normalized = { ...data };
  if (normalized.pricingStatus === "PENDING" && normalized.priceAmount != null)
    throw new AppError(
      400,
      "Pending prices must have a null amount.",
      [],
      "priceAmount",
    );
  if (normalized.pricingStatus === "PENDING") normalized.priceAmount = null;
  if (
    normalized.pricingStatus === "CONFIGURED" &&
    normalized.priceAmount == null
  )
    throw new AppError(
      400,
      "Configured prices require an amount.",
      [],
      "priceAmount",
    );
  if (
    normalized.effectiveTo &&
    normalized.effectiveTo <= normalized.effectiveFrom
  )
    throw new AppError(
      400,
      "Effective-to must be later than effective-from.",
      [],
      "effectiveTo",
    );
  if (normalized.currency !== "PKR")
    throw new AppError(400, "Only PKR pricing is supported.", [], "currency");
  return normalized;
};

async function assertNoPriceOverlap(connection, price, excludeId = null) {
  if (!price.isActive) return;
  const target = priceTargets[price.itemType];
  const params = [price.targetId, price.effectiveTo, price.effectiveFrom];
  let exclude = "";
  if (excludeId) {
    exclude = " AND id<>?";
    params.push(excludeId);
  }
  const [rows] = await connection.execute(
    `SELECT id FROM lab_prices WHERE ${target.column}=? AND is_active=TRUE AND effective_from < COALESCE(?, '9999-12-31 23:59:59') AND (effective_to IS NULL OR effective_to > ?)${exclude} FOR UPDATE`,
    params,
  );
  if (rows.length)
    throw new AppError(
      409,
      "An active price configuration overlaps this effective period.",
      [
        {
          conflictingPriceIds: rows.map((row) => row.id),
          intervalSemantics: "[effectiveFrom, effectiveTo)",
        },
      ],
    );
}

const priceColumns = (price) => ({
  labTestId: price.itemType === "TEST" ? price.targetId : null,
  labProfileId: price.itemType === "PROFILE" ? price.targetId : null,
  labCombinationId: price.itemType === "COMBINATION" ? price.targetId : null,
});

export const labCatalogService = {
  async categories(query) {
    const clauses = [],
      params = [];
    if (query.search) {
      clauses.push("(c.name LIKE ? OR c.code LIKE ? OR c.description LIKE ?)");
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }
    const active = activeCondition(query.status, "c.is_active");
    if (active) clauses.push(active);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      offset = (query.page - 1) * query.limit;
    const [[rows], [counts]] = await Promise.all([
      database.execute(
        `SELECT c.id,c.code,c.name,c.description,c.is_active AS isActive,c.sort_order AS sortOrder,c.created_at AS createdAt,c.updated_at AS updatedAt,COUNT(t.id) testCount FROM lab_categories c LEFT JOIN lab_tests t ON t.category_id=c.id${where} GROUP BY c.id ORDER BY c.sort_order,c.name LIMIT ${query.limit} OFFSET ${offset}`,
        params,
      ),
      database.execute(
        `SELECT COUNT(*) total FROM lab_categories c${where}`,
        params,
      ),
    ]);
    const total = Number(counts[0].total);
    return {
      items: rows.map((row) => ({
        ...row,
        isActive: Boolean(row.isActive),
        testCount: Number(row.testCount),
      })),
      pagination: pagination(query.page, query.limit, total),
    };
  },

  async tests(query) {
    const clauses = [],
      params = [];
    if (query.search) {
      clauses.push("(t.name LIKE ? OR t.code LIKE ? OR t.description LIKE ?)");
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }
    if (query.categoryId) {
      clauses.push("t.category_id=?");
      params.push(query.categoryId);
    }
    if (query.orderable !== "all")
      clauses.push(
        `t.is_orderable=${query.orderable === "yes" ? "TRUE" : "FALSE"}`,
      );
    const active = activeCondition(query.status, "t.is_active");
    if (active) clauses.push(active);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      offset = (query.page - 1) * query.limit;
    const [[rows], [counts]] = await Promise.all([
      database.execute(
        `SELECT t.id,t.category_id AS categoryId,t.code,t.name,t.description,t.estimated_processing_seconds AS estimatedProcessingSeconds,t.is_orderable AS isOrderable,t.is_active AS isActive,t.created_at AS createdAt,t.updated_at AS updatedAt,c.code AS categoryCode,c.name AS categoryName FROM lab_tests t JOIN lab_categories c ON c.id=t.category_id${where} ORDER BY c.sort_order,t.name LIMIT ${query.limit} OFFSET ${offset}`,
        params,
      ),
      database.execute(
        `SELECT COUNT(*) total FROM lab_tests t${where}`,
        params,
      ),
    ]);
    const priceMap = await pricesFor(
      "TEST",
      rows.map((row) => row.id),
    );
    const total = Number(counts[0].total);
    return {
      items: rows.map((row) => ({
        ...presentTest(row),
        prices: priceMap.get(Number(row.id)) || [],
      })),
      pagination: pagination(query.page, query.limit, total),
    };
  },

  async test(id) {
    const [rows] = await database.execute(
      `SELECT t.id,t.category_id AS categoryId,t.code,t.name,t.description,t.estimated_processing_seconds AS estimatedProcessingSeconds,t.is_orderable AS isOrderable,t.is_active AS isActive,t.created_at AS createdAt,t.updated_at AS updatedAt,c.code AS categoryCode,c.name AS categoryName FROM lab_tests t JOIN lab_categories c ON c.id=t.category_id WHERE t.id=?`,
      [id],
    );
    if (!rows.length) throw new AppError(404, "Laboratory test not found.");
    const [parameterMap, priceMap] = await Promise.all([
      parametersFor([id]),
      pricesFor("TEST", [id]),
    ]);
    return {
      ...presentTest(rows[0]),
      parameters: parameterMap.get(Number(id)) || [],
      prices: priceMap.get(Number(id)) || [],
    };
  },

  async createCategory(data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_CATEGORY_CREATED",
        entity: "LAB_CATEGORY",
        work: async (connection) => {
          await uniqueCode(
            connection,
            "lab_categories",
            data.code,
            null,
            "Laboratory category",
          );
          const [result] = await connection.execute(
            "INSERT INTO lab_categories(code,name,is_active,sort_order) VALUES(?,?,?,?)",
            [data.code, data.name, data.isActive, data.sortOrder],
          );
          return categoryById(result.insertId, connection);
        },
      });
    } catch (error) {
      throw mutationError(error, "Laboratory category");
    }
  },

  async updateCategory(id, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_CATEGORY_UPDATED",
        entity: "LAB_CATEGORY",
        entityId: id,
        oldData: (connection) => categoryById(id, connection, true),
        work: async (connection) => {
          const current = await categoryById(id, connection, true);
          if (data.code && data.code !== current.code) {
            const [[usage]] = await connection.execute(
              "SELECT COUNT(*) total FROM lab_tests WHERE category_id=?",
              [id],
            );
            if (Number(usage.total))
              throw new AppError(
                409,
                "Category code cannot be changed after tests reference the category.",
                [],
                "code",
              );
            await uniqueCode(
              connection,
              "lab_categories",
              data.code,
              id,
              "Laboratory category",
            );
          }
          const columns = {
            code: "code",
            name: "name",
            sortOrder: "sort_order",
            isActive: "is_active",
          };
          const changes = Object.entries(columns).filter(([key]) =>
            Object.hasOwn(data, key),
          );
          await connection.execute(
            `UPDATE lab_categories SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`,
            [...changes.map(([key]) => data[key] ?? null), id],
          );
        },
        newData: (connection) => categoryById(id, connection),
      });
    } catch (error) {
      throw mutationError(error, "Laboratory category");
    }
  },

  async setCategoryStatus(id, isActive, actor) {
    return mutate({
      actor,
      action: isActive ? "LAB_CATEGORY_ACTIVATED" : "LAB_CATEGORY_DEACTIVATED",
      entity: "LAB_CATEGORY",
      entityId: id,
      oldData: (connection) => categoryById(id, connection, true),
      work: (connection) =>
        connection.execute("UPDATE lab_categories SET is_active=? WHERE id=?", [
          isActive,
          id,
        ]),
      newData: (connection) => categoryById(id, connection),
    });
  },

  async createTest(data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_TEST_CREATED",
        entity: "LAB_TEST",
        work: async (connection) => {
          await validCategory(connection, data.categoryId);
          await uniqueCode(
            connection,
            "lab_tests",
            data.code,
            null,
            "Laboratory test",
          );
          const [result] = await connection.execute(
            "INSERT INTO lab_tests(category_id,code,name,is_orderable,is_active) VALUES(?,?,?,?,?)",
            [
              data.categoryId,
              data.code,
              data.name,
              data.isOrderable,
              data.isActive,
            ],
          );
          return testById(result.insertId, connection);
        },
      });
    } catch (error) {
      throw mutationError(error, "Laboratory test");
    }
  },

  async updateTest(id, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_TEST_UPDATED",
        entity: "LAB_TEST",
        entityId: id,
        oldData: (connection) => testById(id, connection, true),
        work: async (connection) => {
          const current = await testById(id, connection, true);
          if (data.categoryId) await validCategory(connection, data.categoryId);
          if (data.code && data.code !== current.code)
            await uniqueCode(
              connection,
              "lab_tests",
              data.code,
              id,
              "Laboratory test",
            );
          const columns = {
            categoryId: "category_id",
            code: "code",
            name: "name",
            isOrderable: "is_orderable",
            isActive: "is_active",
          };
          const changes = Object.entries(columns).filter(([key]) =>
            Object.hasOwn(data, key),
          );
          await connection.execute(
            `UPDATE lab_tests SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`,
            [...changes.map(([key]) => data[key] ?? null), id],
          );
        },
        newData: (connection) => testById(id, connection),
      });
    } catch (error) {
      throw mutationError(error, "Laboratory test");
    }
  },

  async setTestStatus(id, isActive, actor) {
    return mutate({
      actor,
      action: isActive ? "LAB_TEST_ACTIVATED" : "LAB_TEST_DEACTIVATED",
      entity: "LAB_TEST",
      entityId: id,
      oldData: (connection) => testById(id, connection, true),
      work: (connection) =>
        connection.execute("UPDATE lab_tests SET is_active=? WHERE id=?", [
          isActive,
          id,
        ]),
      newData: (connection) => testById(id, connection),
    });
  },

  async createParameter(testId, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_TEST_PARAMETER_CREATED",
        entity: "LAB_TEST_PARAMETER",
        work: async (connection) => {
          await testById(testId, connection, true);
          await uniqueParameterCode(connection, testId, data.code);
          const [result] = await connection.execute(
            "INSERT INTO lab_test_parameters(lab_test_id,code,name,unit,reference_range_text,sort_order,is_active) VALUES(?,?,?,?,?,?,?)",
            [
              testId,
              data.code,
              data.name,
              data.unit || null,
              data.referenceRangeText || null,
              data.sortOrder,
              data.isActive,
            ],
          );
          return parameterById(testId, result.insertId, connection);
        },
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY")
        throw new AppError(
          409,
          "Parameter code already exists for this laboratory test.",
          [],
          "code",
        );
      throw error;
    }
  },

  async updateParameter(testId, parameterId, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_TEST_PARAMETER_UPDATED",
        entity: "LAB_TEST_PARAMETER",
        entityId: parameterId,
        oldData: async (connection) => {
          await testById(testId, connection, true);
          return parameterById(testId, parameterId, connection, true);
        },
        work: async (connection) => {
          if (data.code)
            await uniqueParameterCode(
              connection,
              testId,
              data.code,
              parameterId,
            );
          const columns = {
            code: "code",
            name: "name",
            unit: "unit",
            referenceRangeText: "reference_range_text",
            sortOrder: "sort_order",
            isActive: "is_active",
          };
          const changes = Object.entries(columns).filter(([key]) =>
            Object.hasOwn(data, key),
          );
          await connection.execute(
            `UPDATE lab_test_parameters SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=? AND lab_test_id=?`,
            [...changes.map(([key]) => data[key] ?? null), parameterId, testId],
          );
        },
        newData: (connection) => parameterById(testId, parameterId, connection),
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY")
        throw new AppError(
          409,
          "Parameter code already exists for this laboratory test.",
          [],
          "code",
        );
      throw error;
    }
  },

  async setParameterStatus(testId, parameterId, isActive, actor) {
    return mutate({
      actor,
      action: isActive
        ? "LAB_TEST_PARAMETER_ACTIVATED"
        : "LAB_TEST_PARAMETER_DEACTIVATED",
      entity: "LAB_TEST_PARAMETER",
      entityId: parameterId,
      oldData: async (connection) => {
        await testById(testId, connection, true);
        return parameterById(testId, parameterId, connection, true);
      },
      work: (connection) =>
        connection.execute(
          "UPDATE lab_test_parameters SET is_active=? WHERE id=? AND lab_test_id=?",
          [isActive, parameterId, testId],
        ),
      newData: (connection) => parameterById(testId, parameterId, connection),
    });
  },

  async profiles(query) {
    const clauses = [],
      params = [];
    if (query.search) {
      clauses.push("(p.name LIKE ? OR p.code LIKE ? OR p.description LIKE ?)");
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }
    if (query.orderable !== "all")
      clauses.push(
        `p.is_orderable=${query.orderable === "yes" ? "TRUE" : "FALSE"}`,
      );
    const active = activeCondition(query.status, "p.is_active");
    if (active) clauses.push(active);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      offset = (query.page - 1) * query.limit;
    const [[rows], [counts]] = await Promise.all([
      database.execute(
        `SELECT p.id,p.code,p.name,p.description,p.estimated_processing_seconds AS estimatedProcessingSeconds,p.is_orderable AS isOrderable,p.is_active AS isActive,p.created_at AS createdAt,p.updated_at AS updatedAt,COUNT(pt.id) testCount FROM lab_profiles p LEFT JOIN lab_profile_tests pt ON pt.lab_profile_id=p.id${where} GROUP BY p.id ORDER BY p.name LIMIT ${query.limit} OFFSET ${offset}`,
        params,
      ),
      database.execute(
        `SELECT COUNT(*) total FROM lab_profiles p${where}`,
        params,
      ),
    ]);
    const priceMap = await pricesFor(
      "PROFILE",
      rows.map((row) => row.id),
    );
    const total = Number(counts[0].total);
    return {
      items: rows.map((row) => ({
        ...presentProfile(row),
        testCount: Number(row.testCount),
        prices: priceMap.get(Number(row.id)) || [],
      })),
      pagination: pagination(query.page, query.limit, total),
    };
  },

  async profile(id) {
    return profileDetail(id);
  },

  async createProfile(data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_PROFILE_CREATED",
        entity: "LAB_PROFILE",
        work: async (connection) => {
          await uniqueCode(
            connection,
            "lab_profiles",
            data.code,
            null,
            "Laboratory profile",
          );
          const [result] = await connection.execute(
            "INSERT INTO lab_profiles(code,name,is_orderable,is_active) VALUES(?,?,?,?)",
            [
              data.code,
              data.name,
              data.isOrderable,
              data.isActive,
            ],
          );
          return profileDetail(result.insertId, connection);
        },
      });
    } catch (error) {
      throw mutationError(error, "Laboratory profile");
    }
  },

  async updateProfile(id, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_PROFILE_UPDATED",
        entity: "LAB_PROFILE",
        entityId: id,
        oldData: (connection) => profileDetail(id, connection, true),
        work: async (connection) => {
          const current = await profileById(id, connection, true);
          if (data.code && data.code !== current.code)
            await uniqueCode(
              connection,
              "lab_profiles",
              data.code,
              id,
              "Laboratory profile",
            );
          const columns = {
            code: "code",
            name: "name",
            isOrderable: "is_orderable",
            isActive: "is_active",
          };
          const changes = Object.entries(columns).filter(([key]) =>
            Object.hasOwn(data, key),
          );
          await connection.execute(
            `UPDATE lab_profiles SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`,
            [...changes.map(([key]) => data[key] ?? null), id],
          );
        },
        newData: (connection) => profileDetail(id, connection),
      });
    } catch (error) {
      throw mutationError(error, "Laboratory profile");
    }
  },

  async setProfileStatus(id, isActive, actor) {
    return mutate({
      actor,
      action: isActive ? "LAB_PROFILE_ACTIVATED" : "LAB_PROFILE_DEACTIVATED",
      entity: "LAB_PROFILE",
      entityId: id,
      oldData: (connection) => profileDetail(id, connection, true),
      work: (connection) =>
        connection.execute("UPDATE lab_profiles SET is_active=? WHERE id=?", [
          isActive,
          id,
        ]),
      newData: (connection) => profileDetail(id, connection),
    });
  },

  async setProfileTests(id, testIds, actor) {
    return mutate({
      actor,
      action: "LAB_PROFILE_TESTS_UPDATED",
      entity: "LAB_PROFILE",
      entityId: id,
      oldData: (connection) => profileDetail(id, connection, true),
      work: async (connection) => {
        if (testIds.length) {
          const placeholders = testIds.map(() => "?").join(",");
          const [tests] = await connection.execute(
            `SELECT id FROM lab_tests WHERE id IN (${placeholders}) FOR UPDATE`,
            testIds,
          );
          if (tests.length !== testIds.length)
            throw new AppError(
              400,
              "One or more selected laboratory tests do not exist.",
              [],
              "testIds",
            );
        }
        const [memberships] = await connection.execute(
          "SELECT id,lab_test_id AS testId FROM lab_profile_tests WHERE lab_profile_id=? FOR UPDATE",
          [id],
        );
        const requested = new Set(testIds.map(Number));
        const removed = memberships
          .filter((item) => !requested.has(Number(item.testId)))
          .map((item) => item.id);
        if (removed.length)
          await connection.execute(
            `DELETE FROM lab_profile_tests WHERE id IN (${removed.map(() => "?").join(",")})`,
            removed,
          );
        const existing = new Map(
          memberships.map((item) => [Number(item.testId), item.id]),
        );
        for (const [sortOrder, testId] of testIds.entries()) {
          if (existing.has(testId))
            await connection.execute(
              "UPDATE lab_profile_tests SET sort_order=? WHERE id=?",
              [sortOrder, existing.get(testId)],
            );
          else
            await connection.execute(
              "INSERT INTO lab_profile_tests(lab_profile_id,lab_test_id,sort_order) VALUES(?,?,?)",
              [id, testId, sortOrder],
            );
        }
      },
      newData: (connection) => profileDetail(id, connection),
    });
  },

  async combinations(query) {
    const clauses = [],
      params = [];
    if (query.search) {
      clauses.push("(c.name LIKE ? OR c.code LIKE ? OR c.description LIKE ?)");
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }
    const active = activeCondition(query.status, "c.is_active");
    if (active) clauses.push(active);
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      offset = (query.page - 1) * query.limit;
    const [[rows], [counts]] = await Promise.all([
      database.execute(
        `SELECT c.id,c.code,c.name,c.description,c.is_active AS isActive,c.created_at AS createdAt,c.updated_at AS updatedAt FROM lab_combinations c${where} ORDER BY c.name LIMIT ${query.limit} OFFSET ${offset}`,
        params,
      ),
      database.execute(
        `SELECT COUNT(*) total FROM lab_combinations c${where}`,
        params,
      ),
    ]);
    const ids = rows.map((row) => row.id),
      components = new Map(ids.map((id) => [Number(id), []]));
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      const [items] = await database.execute(
        `SELECT ci.id,ci.lab_combination_id AS combinationId,ci.item_type AS itemType,ci.lab_test_id AS labTestId,ci.lab_profile_id AS labProfileId,ci.sort_order AS sortOrder,COALESCE(t.code,p.code) code,COALESCE(t.name,p.name) name,COALESCE(t.is_active,p.is_active) AS isActive FROM lab_combination_items ci LEFT JOIN lab_tests t ON t.id=ci.lab_test_id LEFT JOIN lab_profiles p ON p.id=ci.lab_profile_id WHERE ci.lab_combination_id IN (${placeholders}) ORDER BY ci.lab_combination_id,ci.sort_order,ci.id`,
        ids,
      );
      for (const item of items)
        components
          .get(Number(item.combinationId))
          ?.push({ ...item, isActive: Boolean(item.isActive) });
    }
    const priceMap = await pricesFor("COMBINATION", ids),
      total = Number(counts[0].total);
    return {
      items: rows.map((row) => ({
        ...row,
        isActive: Boolean(row.isActive),
        components: components.get(Number(row.id)) || [],
        prices: priceMap.get(Number(row.id)) || [],
      })),
      pagination: pagination(query.page, query.limit, total),
    };
  },

  async createCombination(data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_COMBINATION_CREATED",
        entity: "LAB_COMBINATION",
        work: async (connection) => {
          await uniqueCode(
            connection,
            "lab_combinations",
            data.code,
            null,
            "Laboratory combination",
          );
          const [result] = await connection.execute(
            "INSERT INTO lab_combinations(code,name,is_active) VALUES(?,?,?)",
            [data.code, data.name, data.isActive],
          );
          return combinationDetail(result.insertId, connection);
        },
      });
    } catch (error) {
      throw mutationError(error, "Laboratory combination");
    }
  },

  async updateCombination(id, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_COMBINATION_UPDATED",
        entity: "LAB_COMBINATION",
        entityId: id,
        oldData: (connection) => combinationDetail(id, connection, true),
        work: async (connection) => {
          const current = await combinationById(id, connection, true);
          if (data.code && data.code !== current.code)
            await uniqueCode(
              connection,
              "lab_combinations",
              data.code,
              id,
              "Laboratory combination",
            );
          const columns = {
            code: "code",
            name: "name",
            isActive: "is_active",
          };
          const changes = Object.entries(columns).filter(([key]) =>
            Object.hasOwn(data, key),
          );
          await connection.execute(
            `UPDATE lab_combinations SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`,
            [...changes.map(([key]) => data[key] ?? null), id],
          );
        },
        newData: (connection) => combinationDetail(id, connection),
      });
    } catch (error) {
      throw mutationError(error, "Laboratory combination");
    }
  },

  async setCombinationStatus(id, isActive, actor) {
    return mutate({
      actor,
      action: isActive
        ? "LAB_COMBINATION_ACTIVATED"
        : "LAB_COMBINATION_DEACTIVATED",
      entity: "LAB_COMBINATION",
      entityId: id,
      oldData: (connection) => combinationDetail(id, connection, true),
      work: (connection) =>
        connection.execute(
          "UPDATE lab_combinations SET is_active=? WHERE id=?",
          [isActive, id],
        ),
      newData: (connection) => combinationDetail(id, connection),
    });
  },

  async setCombinationItems(id, items, actor) {
    return mutate({
      actor,
      action: "LAB_COMBINATION_ITEMS_UPDATED",
      entity: "LAB_COMBINATION",
      entityId: id,
      oldData: (connection) => combinationDetail(id, connection, true),
      work: async (connection) => {
        const testIds = items
          .filter((item) => item.itemType === "TEST")
          .map((item) => item.targetId);
        const profileIds = items
          .filter((item) => item.itemType === "PROFILE")
          .map((item) => item.targetId);
        for (const [table, ids, field] of [
          ["lab_tests", testIds, "items"],
          ["lab_profiles", profileIds, "items"],
        ]) {
          if (!ids.length) continue;
          const [rows] = await connection.execute(
            `SELECT id FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
            ids,
          );
          if (rows.length !== ids.length)
            throw new AppError(
              400,
              "One or more combination members do not exist.",
              [],
              field,
            );
        }
        const [current] = await connection.execute(
          "SELECT id,item_type AS itemType,lab_test_id AS labTestId,lab_profile_id AS labProfileId FROM lab_combination_items WHERE lab_combination_id=? FOR UPDATE",
          [id],
        );
        const keyFor = (item) =>
          `${item.itemType}:${Number(item.itemType === "TEST" ? (item.labTestId ?? item.targetId) : (item.labProfileId ?? item.targetId))}`;
        const requested = new Set(items.map(keyFor));
        const removed = current
          .filter((item) => !requested.has(keyFor(item)))
          .map((item) => item.id);
        if (removed.length)
          await connection.execute(
            `DELETE FROM lab_combination_items WHERE id IN (${removed.map(() => "?").join(",")})`,
            removed,
          );
        const existing = new Map(
          current.map((item) => [keyFor(item), item.id]),
        );
        for (const [sortOrder, item] of items.entries()) {
          const key = keyFor(item);
          if (existing.has(key))
            await connection.execute(
              "UPDATE lab_combination_items SET sort_order=? WHERE id=?",
              [sortOrder, existing.get(key)],
            );
          else
            await connection.execute(
              "INSERT INTO lab_combination_items(lab_combination_id,item_type,lab_test_id,lab_profile_id,sort_order) VALUES(?,?,?,?,?)",
              [
                id,
                item.itemType,
                item.itemType === "TEST" ? item.targetId : null,
                item.itemType === "PROFILE" ? item.targetId : null,
                sortOrder,
              ],
            );
        }
      },
      newData: (connection) => combinationDetail(id, connection),
    });
  },

  async createPrice(data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_PRICE_CREATED",
        entity: "LAB_PRICE",
        work: async (connection) => {
          const price = normalizePrice(data);
          await lockPriceTarget(connection, price.itemType, price.targetId);
          await assertNoPriceOverlap(connection, price);
          const targets = priceColumns(price);
          const [result] = await connection.execute(
            "INSERT INTO lab_prices(item_type,lab_test_id,lab_profile_id,lab_combination_id,price_amount,currency,pricing_status,effective_from,effective_to,is_active) VALUES(?,?,?,?,?,?,?,?,?,?)",
            [
              price.itemType,
              targets.labTestId,
              targets.labProfileId,
              targets.labCombinationId,
              price.priceAmount,
              price.currency,
              price.pricingStatus,
              price.effectiveFrom,
              price.effectiveTo ?? null,
              price.isActive,
            ],
          );
          return priceById(result.insertId, connection);
        },
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY")
        throw new AppError(
          409,
          "A price configuration already exists for this target and effective-from timestamp.",
          [],
          "effectiveFrom",
        );
      throw error;
    }
  },

  async replaceEffectivePrice(data, actor) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const replacement = normalizePrice({
        ...data,
        effectiveTo: null,
        isActive: true,
      });
      await lockPriceTarget(
        connection,
        replacement.itemType,
        replacement.targetId,
      );
      const target = priceTargets[replacement.itemType];
      const [currentRows] = await connection.execute(
        `SELECT id,item_type AS itemType,lab_test_id AS labTestId,lab_profile_id AS labProfileId,lab_combination_id AS labCombinationId,price_amount AS priceAmount,currency,pricing_status AS pricingStatus,DATE_FORMAT(effective_from,'%Y-%m-%d %H:%i:%s') AS effectiveFrom,DATE_FORMAT(effective_to,'%Y-%m-%d %H:%i:%s') AS effectiveTo,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_prices WHERE ${target.column}=? AND is_active=TRUE AND effective_from<=? AND (effective_to IS NULL OR effective_to>?) ORDER BY effective_from DESC,id DESC FOR UPDATE`,
        [replacement.targetId, replacement.effectiveFrom, replacement.effectiveFrom],
      );
      if (currentRows.length > 1)
        throw new AppError(409, "Multiple active price configurations apply at the replacement time.", [
          { conflictingPriceIds: currentRows.map((row) => row.id) },
        ]);
      const previous = currentRows.length ? presentPrice(currentRows[0]) : null;
      if (previous && replacement.effectiveFrom <= previous.effectiveFrom)
        throw new AppError(
          400,
          "The replacement effective date must be later than the current price start date.",
          [],
          "effectiveFrom",
        );
      if (previous)
        await connection.execute(
          "UPDATE lab_prices SET effective_to=? WHERE id=?",
          [replacement.effectiveFrom, previous.id],
        );
      await assertNoPriceOverlap(connection, replacement);
      const targets = priceColumns(replacement);
      const [result] = await connection.execute(
        "INSERT INTO lab_prices(item_type,lab_test_id,lab_profile_id,lab_combination_id,price_amount,currency,pricing_status,effective_from,effective_to,is_active) VALUES(?,?,?,?,?,?,?,?,NULL,TRUE)",
        [
          replacement.itemType,
          targets.labTestId,
          targets.labProfileId,
          targets.labCombinationId,
          replacement.priceAmount,
          replacement.currency,
          replacement.pricingStatus,
          replacement.effectiveFrom,
        ],
      );
      const created = await priceById(result.insertId, connection);
      await auditService.record({
        ...actor,
        action: "LAB_PRICE_REPLACED",
        entity: "LAB_PRICE",
        entityId: String(created.id),
        oldData: previous,
        newData: created,
        connection,
      });
      await connection.commit();
      return { previousPrice: previous, price: created };
    } catch (error) {
      await connection.rollback();
      if (error?.code === "ER_DUP_ENTRY")
        throw new AppError(
          409,
          "A price configuration already exists for this target and effective timestamp.",
          [],
          "effectiveFrom",
        );
      throw error;
    } finally {
      connection.release();
    }
  },

  async updatePrice(id, data, actor) {
    try {
      return await mutate({
        actor,
        action: "LAB_PRICE_UPDATED",
        entity: "LAB_PRICE",
        entityId: id,
        oldData: (connection) => priceById(id, connection, true),
        work: async (connection) => {
          const current = await priceById(id, connection, true);
          if (
            data.itemType &&
            data.itemType !== current.itemType &&
            !data.targetId
          )
            throw new AppError(
              400,
              "targetId is required when changing itemType.",
              [],
              "targetId",
            );
          const price = normalizePrice({
            itemType: data.itemType ?? current.itemType,
            targetId: data.targetId ?? targetIdFromPrice(current),
            priceAmount: Object.hasOwn(data, "priceAmount")
              ? data.priceAmount
              : current.priceAmountExact,
            currency: data.currency ?? current.currency,
            pricingStatus: data.pricingStatus ?? current.pricingStatus,
            effectiveFrom: data.effectiveFrom ?? current.effectiveFrom,
            effectiveTo: Object.hasOwn(data, "effectiveTo")
              ? data.effectiveTo
              : current.effectiveTo,
            isActive: data.isActive ?? current.isActive,
          });
          await lockPriceTarget(connection, price.itemType, price.targetId);
          await assertNoPriceOverlap(connection, price, id);
          const targets = priceColumns(price);
          await connection.execute(
            "UPDATE lab_prices SET item_type=?,lab_test_id=?,lab_profile_id=?,lab_combination_id=?,price_amount=?,currency=?,pricing_status=?,effective_from=?,effective_to=?,is_active=? WHERE id=?",
            [
              price.itemType,
              targets.labTestId,
              targets.labProfileId,
              targets.labCombinationId,
              price.priceAmount,
              price.currency,
              price.pricingStatus,
              price.effectiveFrom,
              price.effectiveTo ?? null,
              price.isActive,
              id,
            ],
          );
        },
        newData: (connection) => priceById(id, connection),
      });
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY")
        throw new AppError(
          409,
          "A price configuration already exists for this target and effective-from timestamp.",
          [],
          "effectiveFrom",
        );
      throw error;
    }
  },

  async setPriceStatus(id, isActive, actor) {
    return mutate({
      actor,
      action: isActive ? "LAB_PRICE_ACTIVATED" : "LAB_PRICE_DEACTIVATED",
      entity: "LAB_PRICE",
      entityId: id,
      oldData: (connection) => priceById(id, connection, true),
      work: async (connection) => {
        const current = await priceById(id, connection, true);
        const price = {
          ...current,
          targetId: targetIdFromPrice(current),
          isActive,
        };
        await lockPriceTarget(connection, price.itemType, price.targetId);
        await assertNoPriceOverlap(connection, price, id);
        await connection.execute(
          "UPDATE lab_prices SET is_active=? WHERE id=?",
          [isActive, id],
        );
      },
      newData: (connection) => priceById(id, connection),
    });
  },

  async effectivePrice({ itemType, targetId, effectiveAt }) {
    const target = priceTargets[itemType];
    const [catalogItems] = await database.execute(
      `SELECT id FROM ${target.table} WHERE id=?`,
      [targetId],
    );
    if (!catalogItems.length)
      throw new AppError(404, `${target.label} not found.`, [], "targetId");
    let at = effectiveAt;
    if (!at) {
      const [[clock]] = await database.execute(
        "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') effectiveAt",
      );
      at = clock.effectiveAt;
    }
    const [rows] = await database.execute(
      `SELECT id,item_type AS itemType,lab_test_id AS labTestId,lab_profile_id AS labProfileId,lab_combination_id AS labCombinationId,price_amount AS priceAmount,currency,pricing_status AS pricingStatus,effective_from AS effectiveFrom,effective_to AS effectiveTo,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM lab_prices WHERE ${target.column}=? AND is_active=TRUE AND effective_from<=? AND (effective_to IS NULL OR effective_to>?) ORDER BY effective_from DESC,id DESC`,
      [targetId, at, at],
    );
    if (rows.length > 1)
      throw new AppError(
        409,
        "Multiple active price configurations apply at the requested time.",
        [{ conflictingPriceIds: rows.map((row) => row.id), effectiveAt: at }],
      );
    if (!rows.length)
      return {
        itemType,
        targetId,
        effectiveAt: at,
        pricingStatus: "PENDING",
        priceAmount: null,
        priceAmountExact: null,
        currency: "PKR",
        sourcePriceId: null,
        reason: "UNCONFIGURED",
      };
    const price = presentPrice(rows[0]);
    return {
      itemType,
      targetId,
      effectiveAt: at,
      pricingStatus: price.pricingStatus,
      priceAmount: price.priceAmount,
      priceAmountExact: price.priceAmountExact,
      currency: price.currency,
      sourcePriceId: price.id,
      isFree: price.isFree,
      effectiveFrom: price.effectiveFrom,
      effectiveTo: price.effectiveTo,
    };
  },

  async prices(query) {
    const clauses = [],
      params = [];
    if (query.itemType) {
      clauses.push("p.item_type=?");
      params.push(query.itemType);
    }
    if (query.pricingStatus) {
      clauses.push("p.pricing_status=?");
      params.push(query.pricingStatus);
    }
    const active = activeCondition(query.status, "p.is_active");
    if (active) clauses.push(active);
    if (query.targetId) {
      if (!query.itemType)
        throw new AppError(
          400,
          "itemType is required when targetId is provided.",
        );
      const column = {
        TEST: "p.lab_test_id",
        PROFILE: "p.lab_profile_id",
        COMBINATION: "p.lab_combination_id",
      }[query.itemType];
      clauses.push(`${column}=?`);
      params.push(query.targetId);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
      offset = (query.page - 1) * query.limit;
    const [[rows], [counts]] = await Promise.all([
      database.execute(
        `SELECT p.id,p.item_type AS itemType,p.lab_test_id AS labTestId,p.lab_profile_id AS labProfileId,p.lab_combination_id AS labCombinationId,p.price_amount AS priceAmount,p.currency,p.pricing_status AS pricingStatus,p.effective_from AS effectiveFrom,p.effective_to AS effectiveTo,p.is_active AS isActive,p.created_at AS createdAt,p.updated_at AS updatedAt,CASE p.item_type WHEN 'TEST' THEN t.code WHEN 'PROFILE' THEN pr.code ELSE c.code END AS itemCode,CASE p.item_type WHEN 'TEST' THEN t.name WHEN 'PROFILE' THEN pr.name ELSE c.name END AS itemName FROM lab_prices p LEFT JOIN lab_tests t ON t.id=p.lab_test_id LEFT JOIN lab_profiles pr ON pr.id=p.lab_profile_id LEFT JOIN lab_combinations c ON c.id=p.lab_combination_id${where} ORDER BY p.effective_from DESC,p.id DESC LIMIT ${query.limit} OFFSET ${offset}`,
        params,
      ),
      database.execute(
        `SELECT COUNT(*) total FROM lab_prices p${where}`,
        params,
      ),
    ]);
    const total = Number(counts[0].total);
    return {
      items: rows.map(presentPrice),
      pagination: pagination(query.page, query.limit, total),
      resolutionPolicy:
        "All matching configurations are returned; use /api/v1/lab/catalog/effective-price for conflict-safe effective resolution.",
    };
  },
};
