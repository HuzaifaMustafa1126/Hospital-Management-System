import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { database } from "../db/database.js";

const execute = process.argv.includes("--execute");
const projectRoot = new URL("../../../", import.meta.url);
const workbookPath =
  "/Users/apple/Downloads/Final Rate List Red Cresent General Hospital.xlsx";
const manifestPath = new URL(
  "docs/lab-rate-sheet-import-manifest.md",
  projectRoot,
);
const expectedWorkbookHash =
  "383ece09ff80502a3ca63cb09420aaf0292d14dbe9c917dc4970ce9c1ed222fb";
const expectedManifestHash =
  "0a41771e4635b2322baf36f893f5c38b73e7a4042da746fd567b2f76115b1d3c";

const categories = [
  ["CHEMISTRY", "Clinical Chemistry", 10],
  ["COAGULATION", "Coagulation", 20],
  ["HEMATOLOGY", "Hematology", 30],
  ["IMMUNOLOGY", "Immunology and Serology", 40],
  ["BLOOD_BANK", "Blood Bank", 50],
  ["URINALYSIS", "Urinalysis", 60],
  ["CARDIAC", "Cardiac Markers", 70],
];

const one = (code, name = code) => [{ code, name }];
const tests = [
  {
    code: "ALT",
    name: "ALT",
    category: "CHEMISTRY",
    seconds: 150,
    orderable: true,
    parameters: one("ALT"),
  },
  {
    code: "AST",
    name: "AST",
    category: "CHEMISTRY",
    seconds: 150,
    orderable: true,
    parameters: one("AST"),
  },
  {
    code: "ALP",
    name: "ALP",
    category: "CHEMISTRY",
    seconds: 150,
    orderable: true,
    parameters: one("ALP"),
  },
  {
    code: "BILIRUBIN_TOTAL",
    name: "Total Bilirubin",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: true,
    parameters: one("BILIRUBIN_TOTAL", "T. Bilirubin"),
  },
  {
    code: "BILIRUBIN_DIRECT",
    name: "Direct Bilirubin",
    category: "CHEMISTRY",
    seconds: 90,
    orderable: true,
    parameters: one("BILIRUBIN_DIRECT", "D. Bilirubin"),
  },
  {
    code: "BILIRUBIN_INDIRECT",
    name: "Indirect Bilirubin",
    category: "CHEMISTRY",
    seconds: 90,
    orderable: true,
    parameters: one("BILIRUBIN_INDIRECT", "I. Bilirubin"),
  },
  {
    code: "TOTAL_PROTEIN",
    name: "Total Protein",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: true,
    source: "T. Protein",
    parameters: one("TOTAL_PROTEIN", "T. Protein"),
  },
  {
    code: "ALBUMIN",
    name: "Albumin",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: true,
    parameters: one("ALBUMIN", "Albumin"),
  },
  {
    code: "GLOBULIN",
    name: "Globulin",
    category: "CHEMISTRY",
    seconds: 90,
    orderable: true,
    parameters: one("GLOBULIN", "Globulin"),
  },
  {
    code: "AG_RATIO",
    name: "A/G Ratio",
    category: "CHEMISTRY",
    seconds: 0,
    orderable: true,
    parameters: one("AG_RATIO", "A/G Ratio"),
  },
  {
    code: "UREA",
    name: "Urea",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: true,
    group: "RFT",
    parameters: one("UREA", "Urea"),
  },
  {
    code: "CREATININE",
    name: "Creatinine",
    category: "CHEMISTRY",
    seconds: 180,
    orderable: true,
    group: "RFT",
    parameters: one("CREATININE", "Creatinine"),
  },
  {
    code: "URIC_ACID",
    name: "Uric Acid",
    category: "CHEMISTRY",
    seconds: 60,
    orderable: true,
    group: "RFT",
    parameters: one("URIC_ACID", "Uric Acid"),
  },
  {
    code: "HDL",
    name: "HDL",
    category: "CHEMISTRY",
    seconds: 60,
    orderable: false,
    parameters: one("HDL"),
  },
  {
    code: "LDL",
    name: "LDL",
    category: "CHEMISTRY",
    seconds: 60,
    orderable: false,
    parameters: one("LDL"),
  },
  {
    code: "TOTAL_CHOLESTEROL",
    name: "Total Cholesterol",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: false,
    source: "Cholesterole",
    parameters: one("TOTAL_CHOLESTEROL", "Cholesterole"),
  },
  {
    code: "TRIGLYCERIDES",
    name: "Triglycerides",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: false,
    parameters: one("TRIGLYCERIDES", "Triglycerides"),
  },
  {
    code: "BLOOD_GLUCOSE",
    name: "Glucose / BSR/BSF",
    category: "CHEMISTRY",
    seconds: 30,
    orderable: true,
    parameters: one("BSR_BSF", "BSR/BSF"),
  },
  {
    code: "SODIUM",
    name: "Sodium (Na+)",
    category: "CHEMISTRY",
    seconds: null,
    orderable: false,
    parameters: one("SODIUM", "Na+"),
  },
  {
    code: "POTASSIUM",
    name: "Potassium (K+)",
    category: "CHEMISTRY",
    seconds: null,
    orderable: false,
    parameters: one("POTASSIUM", "K+"),
  },
  {
    code: "CHLORIDE",
    name: "Chloride (Cl-)",
    category: "CHEMISTRY",
    seconds: null,
    orderable: false,
    parameters: one("CHLORIDE", "Cl-"),
  },
  {
    code: "PT_INR",
    name: "PT with INR",
    category: "COAGULATION",
    seconds: 240,
    orderable: true,
    parameters: one("PT_INR", "PT with INR"),
  },
  {
    code: "APTT",
    name: "aPTT",
    category: "COAGULATION",
    seconds: 300,
    orderable: true,
    source: "ApTT",
    parameters: one("APTT", "ApTT"),
  },
  {
    code: "CBC",
    name: "CBC",
    category: "HEMATOLOGY",
    seconds: 90,
    orderable: true,
    parameters: [
      "Hb",
      "TLC",
      "RBC",
      "Platelets",
      "Granulocytes",
      "Lymphocytes",
      "Mix",
    ].map((name) => ({ code: name.toUpperCase(), name })),
  },
  {
    code: "ESR",
    name: "ESR",
    category: "HEMATOLOGY",
    seconds: 3600,
    orderable: true,
    parameters: one("ESR"),
  },
  {
    code: "CRP_QUALITATIVE",
    name: "CRP Qualitative",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    parameters: one("CRP_QUALITATIVE", "CRP Qualitative"),
  },
  {
    code: "RA_FACTOR_QUALITATIVE",
    name: "RA Factor Qualitative",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    parameters: one("RA_FACTOR_QUALITATIVE", "RA Factor Qualitative"),
  },
  {
    code: "ANA_SLE",
    name: "ANA/SLE",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    parameters: one("ANA_SLE", "ANA/SLE"),
  },
  {
    code: "BLOOD_GROUP",
    name: "Blood Group",
    category: "BLOOD_BANK",
    seconds: 120,
    orderable: true,
    parameters: one("BLOOD_GROUP", "Blood Group"),
  },
  {
    code: "CROSS_MATCH",
    name: "Cross Match",
    category: "BLOOD_BANK",
    seconds: null,
    orderable: false,
    description:
      "Source component of Cross Match with Screening; combined workflow processing time is 600 seconds.",
    parameters: [],
  },
  {
    code: "SCREENING",
    name: "Screening",
    category: "BLOOD_BANK",
    seconds: null,
    orderable: false,
    description:
      "Source component of Cross Match with Screening; combined workflow processing time is 600 seconds.",
    parameters: [],
  },
  {
    code: "URINE_RE",
    name: "Urine Routine Examination",
    category: "URINALYSIS",
    seconds: 120,
    orderable: true,
    source: "U R/E",
    parameters: [],
  },
  {
    code: "UPT",
    name: "Urine Pregnancy Test",
    category: "URINALYSIS",
    seconds: 120,
    orderable: true,
    parameters: one("UPT", "Urine Pregnancy Test"),
  },
  {
    code: "HBSAG",
    name: "HBsAg",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    source: "HbsAg",
    parameters: one("HBSAG", "HbsAg"),
  },
  {
    code: "ANTI_HCV",
    name: "anti-HCV",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    parameters: one("ANTI_HCV", "anti-HCV"),
  },
  {
    code: "ANTI_HIV",
    name: "anti-HIV",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    parameters: one("ANTI_HIV", "anti-HIV"),
  },
  {
    code: "SYPHILIS_RPR_VDRL",
    name: "Syphilis/RPR/VDRL",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    source: "Syphillis/ RPR/ VDRL",
    parameters: one("SYPHILIS_RPR_VDRL", "Syphillis/RPR/VDRL"),
  },
  {
    code: "H_PYLORI",
    name: "H. pylori",
    category: "IMMUNOLOGY",
    seconds: 120,
    orderable: true,
    source: "H. Pylori",
    parameters: one("H_PYLORI", "H. Pylori"),
  },
  {
    code: "MALARIA_PARASITE",
    name: "MP",
    category: "HEMATOLOGY",
    seconds: 120,
    orderable: true,
    description: "MP (Malaria Parasite) from source workbook.",
    parameters: one("MP"),
  },
  {
    code: "TROPONIN_I",
    name: "Trop-I",
    category: "CARDIAC",
    seconds: 120,
    orderable: true,
    description: "Trop-I (Troponin-I) from source workbook.",
    parameters: one("TROP_I", "Trop-I"),
  },
];

const profiles = [
  {
    code: "LFT",
    name: "LFT (Liver Function Test)",
    seconds: null,
    members: [
      "ALT",
      "AST",
      "ALP",
      "BILIRUBIN_TOTAL",
      "BILIRUBIN_DIRECT",
      "BILIRUBIN_INDIRECT",
      "TOTAL_PROTEIN",
      "ALBUMIN",
      "GLOBULIN",
      "AG_RATIO",
    ],
  },
  {
    code: "FLP",
    name: "FLP (Fasting Lipid Profile)",
    seconds: null,
    description:
      "Approved PKR 500 profile; source workbook value PKR 700 retained as an override record.",
    members: ["HDL", "LDL", "TOTAL_CHOLESTEROL", "TRIGLYCERIDES"],
  },
  {
    code: "SERUM_ELECTROLYTES",
    name: "Serum Electrolytes",
    seconds: 180,
    members: ["SODIUM", "POTASSIUM", "CHLORIDE"],
  },
];

const combinations = [
  {
    code: "BILIRUBIN_PANEL",
    name: "Bilirubin Panel",
    description: "Approved combined rate for all three bilirubin components.",
    members: ["BILIRUBIN_TOTAL", "BILIRUBIN_DIRECT", "BILIRUBIN_INDIRECT"],
  },
  {
    code: "UREA_CREATININE",
    name: "Urea + Creatinine",
    description: "Approved discounted combination.",
    members: ["UREA", "CREATININE"],
  },
  {
    code: "PT_INR_APTT",
    name: "PT/INR + aPTT",
    description: "Approved discounted combination.",
    members: ["PT_INR", "APTT"],
  },
  {
    code: "CROSS_MATCH_SCREENING",
    name: "Cross Match with Screening",
    description:
      "Source price breakdown PKR 300 + PKR 700; combined workflow processing time 600 seconds.",
    members: ["CROSS_MATCH", "SCREENING"],
  },
];

const pending = new Set([
  "BILIRUBIN_TOTAL",
  "BILIRUBIN_DIRECT",
  "BILIRUBIN_INDIRECT",
  "HDL",
  "LDL",
  "TOTAL_CHOLESTEROL",
  "TRIGLYCERIDES",
  "SODIUM",
  "POTASSIUM",
  "CHLORIDE",
  "ANTI_HCV",
]);
const testAmounts = {
  ALT: "150.00",
  AST: "150.00",
  ALP: "150.00",
  TOTAL_PROTEIN: "200.00",
  ALBUMIN: "200.00",
  GLOBULIN: "200.00",
  AG_RATIO: "100.00",
  UREA: "150.00",
  CREATININE: "150.00",
  URIC_ACID: "200.00",
  BLOOD_GLUCOSE: "100.00",
  PT_INR: "300.00",
  APTT: "300.00",
  CBC: "200.00",
  ESR: "100.00",
  CRP_QUALITATIVE: "700.00",
  RA_FACTOR_QUALITATIVE: "300.00",
  ANA_SLE: "400.00",
  BLOOD_GROUP: "100.00",
  CROSS_MATCH: "300.00",
  SCREENING: "700.00",
  URINE_RE: "200.00",
  UPT: "50.00",
  HBSAG: "200.00",
  ANTI_HIV: "150.00",
  SYPHILIS_RPR_VDRL: "150.00",
  H_PYLORI: "200.00",
  MALARIA_PARASITE: "150.00",
  TROPONIN_I: "400.00",
};
const profileAmounts = {
  LFT: "500.00",
  FLP: "500.00",
  SERUM_ELECTROLYTES: "500.00",
};
const combinationAmounts = {
  BILIRUBIN_PANEL: "300.00",
  UREA_CREATININE: "250.00",
  PT_INR_APTT: "500.00",
  CROSS_MATCH_SCREENING: "1000.00",
};
const tableNames = [
  "lab_categories",
  "lab_tests",
  "lab_test_parameters",
  "lab_profiles",
  "lab_profile_tests",
  "lab_combinations",
  "lab_combination_items",
  "lab_prices",
];

const hash = async (path) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const unique = (values, label) => {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}.`);
};

async function validateManifest() {
  if ((await hash(workbookPath)) !== expectedWorkbookHash)
    throw new Error("Workbook checksum does not match the approved source.");
  if ((await hash(manifestPath)) !== expectedManifestHash)
    throw new Error("Manifest checksum does not match the approved document.");
  unique(
    categories.map(([code]) => code),
    "category codes",
  );
  unique(
    tests.map(({ code }) => code),
    "test codes",
  );
  unique(
    profiles.map(({ code }) => code),
    "profile codes",
  );
  unique(
    combinations.map(({ code }) => code),
    "combination codes",
  );
  for (const test of tests)
    unique(
      test.parameters.map(({ code }) => code),
      `parameter codes for ${test.code}`,
    );
  const testCodes = new Set(tests.map(({ code }) => code));
  for (const item of [...profiles, ...combinations])
    for (const code of item.members)
      if (!testCodes.has(code))
        throw new Error(`${item.code} references missing test ${code}.`);
  const counts = {
    lab_categories: categories.length,
    lab_tests: tests.length,
    lab_test_parameters: tests.reduce(
      (total, test) => total + test.parameters.length,
      0,
    ),
    lab_profiles: profiles.length,
    lab_profile_tests: profiles.reduce(
      (total, profile) => total + profile.members.length,
      0,
    ),
    lab_combinations: combinations.length,
    lab_combination_items: combinations.reduce(
      (total, combination) => total + combination.members.length,
      0,
    ),
    lab_prices: tests.length + profiles.length + combinations.length,
  };
  const expected = {
    lab_categories: 7,
    lab_tests: 40,
    lab_test_parameters: 43,
    lab_profiles: 3,
    lab_profile_tests: 17,
    lab_combinations: 4,
    lab_combination_items: 9,
    lab_prices: 47,
  };
  for (const [table, count] of Object.entries(expected))
    if (counts[table] !== count)
      throw new Error(
        `${table} manifest count ${counts[table]} does not match ${count}.`,
      );
  if (Object.keys(testAmounts).length !== 29 || pending.size !== 11)
    throw new Error("Test price status counts are invalid.");
  if (
    Object.keys(profileAmounts).length !== 3 ||
    Object.keys(combinationAmounts).length !== 4
  )
    throw new Error("Profile or combination price counts are invalid.");
  return counts;
}

async function livePreflight(counts) {
  const [[connectionInfo]] = await database.query(
    "SELECT DATABASE() databaseName,@@hostname hostname,@@port port,@@session.time_zone sessionTimeZone,@@system_time_zone systemTimeZone",
  );
  if (connectionInfo.databaseName !== "hospital_management")
    throw new Error(`Unexpected database ${connectionInfo.databaseName}.`);
  const [tables] = await database.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name LIKE 'lab_%'",
  );
  const existingTables = new Set(
    tables.map((row) => row.TABLE_NAME || row.table_name),
  );
  for (const table of tableNames)
    if (!existingTables.has(table))
      throw new Error(`Required table ${table} is missing.`);
  const current = {};
  for (const table of tableNames) {
    const [[row]] = await database.query(`SELECT COUNT(*) total FROM ${table}`);
    current[table] = Number(row.total);
    if (current[table] !== 0)
      throw new Error(
        `${table} contains ${current[table]} rows; fresh import required.`,
      );
  }
  return {
    connectionInfo,
    current,
    dryRun: {
      insert: Object.values(counts).reduce((a, b) => a + b, 0),
      reuse: 0,
      conflict: 0,
    },
  };
}

async function importCatalog(counts) {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [[actor]] = await connection.execute(
      "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name='SUPER_ADMIN' AND u.status='ACTIVE' AND u.deleted_at IS NULL ORDER BY u.created_at LIMIT 1 FOR UPDATE",
    );
    if (!actor)
      throw new Error(
        "No active Super Admin is available for the import audit record.",
      );
    const [[clock]] = await connection.execute(
      "SELECT DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s') effectiveAt,@@session.time_zone sessionTimeZone,@@system_time_zone systemTimeZone",
    );
    const categoryIds = new Map();
    for (const [code, name, sortOrder] of categories) {
      const [result] = await connection.execute(
        "INSERT INTO lab_categories(code,name,description,is_active,sort_order) VALUES(?,?,?,TRUE,?)",
        [
          code,
          name,
          "Administrative category for the approved Red Crescent rate-sheet import.",
          sortOrder,
        ],
      );
      categoryIds.set(code, result.insertId);
    }
    const testIds = new Map();
    for (const test of tests) {
      const sourceNote = test.source ? ` Source label: ${test.source}.` : "";
      const groupNote = test.group ? ` Source grouping: ${test.group}.` : "";
      const description =
        test.description ||
        `Imported from the approved Red Crescent General Hospital rate sheet.${sourceNote}${groupNote}`;
      const [result] = await connection.execute(
        "INSERT INTO lab_tests(category_id,code,name,description,estimated_processing_seconds,is_orderable,is_active) VALUES(?,?,?,?,?,?,TRUE)",
        [
          categoryIds.get(test.category),
          test.code,
          test.name,
          description,
          test.seconds,
          test.orderable,
        ],
      );
      testIds.set(test.code, result.insertId);
      for (const [sortOrder, parameter] of test.parameters.entries())
        await connection.execute(
          "INSERT INTO lab_test_parameters(lab_test_id,code,name,unit,reference_range_text,sort_order,is_active) VALUES(?,?,?,NULL,NULL,?,TRUE)",
          [result.insertId, parameter.code, parameter.name, sortOrder],
        );
    }
    const profileIds = new Map();
    for (const profile of profiles) {
      const [result] = await connection.execute(
        "INSERT INTO lab_profiles(code,name,description,estimated_processing_seconds,is_orderable,is_active) VALUES(?,?,?,?,TRUE,TRUE)",
        [
          profile.code,
          profile.name,
          profile.description ||
            "Complete fixed-price profile from the approved Red Crescent rate-sheet manifest.",
          profile.seconds,
        ],
      );
      profileIds.set(profile.code, result.insertId);
      for (const [sortOrder, code] of profile.members.entries())
        await connection.execute(
          "INSERT INTO lab_profile_tests(lab_profile_id,lab_test_id,sort_order) VALUES(?,?,?)",
          [result.insertId, testIds.get(code), sortOrder],
        );
    }
    const combinationIds = new Map();
    for (const combination of combinations) {
      const [result] = await connection.execute(
        "INSERT INTO lab_combinations(code,name,description,is_active) VALUES(?,?,?,TRUE)",
        [combination.code, combination.name, combination.description],
      );
      combinationIds.set(combination.code, result.insertId);
      for (const [sortOrder, code] of combination.members.entries())
        await connection.execute(
          "INSERT INTO lab_combination_items(lab_combination_id,item_type,lab_test_id,lab_profile_id,sort_order) VALUES(?,'TEST',?,NULL,?)",
          [result.insertId, testIds.get(code), sortOrder],
        );
    }
    const insertPrice = async (
      itemType,
      targetColumn,
      targetId,
      amount,
      status,
    ) => {
      const targetTable = {
        TEST: "lab_tests",
        PROFILE: "lab_profiles",
        COMBINATION: "lab_combinations",
      }[itemType];
      await connection.execute(
        `SELECT id FROM ${targetTable} WHERE id=? FOR UPDATE`,
        [targetId],
      );
      const [overlaps] = await connection.execute(
        `SELECT id FROM lab_prices WHERE ${targetColumn}=? AND is_active=TRUE AND effective_from<=? AND (effective_to IS NULL OR effective_to>?) FOR UPDATE`,
        [targetId, clock.effectiveAt, clock.effectiveAt],
      );
      if (overlaps.length)
        throw new Error(
          `Active price overlap detected for ${itemType} #${targetId}.`,
        );
      const targets = {
        lab_test_id: null,
        lab_profile_id: null,
        lab_combination_id: null,
      };
      targets[targetColumn] = targetId;
      await connection.execute(
        "INSERT INTO lab_prices(item_type,lab_test_id,lab_profile_id,lab_combination_id,price_amount,currency,pricing_status,effective_from,effective_to,is_active) VALUES(?,?,?,?,?,'PKR',?,?,NULL,TRUE)",
        [
          itemType,
          targets.lab_test_id,
          targets.lab_profile_id,
          targets.lab_combination_id,
          amount,
          status,
          clock.effectiveAt,
        ],
      );
    };
    for (const test of tests)
      await insertPrice(
        "TEST",
        "lab_test_id",
        testIds.get(test.code),
        pending.has(test.code) ? null : testAmounts[test.code],
        pending.has(test.code) ? "PENDING" : "CONFIGURED",
      );
    for (const profile of profiles)
      await insertPrice(
        "PROFILE",
        "lab_profile_id",
        profileIds.get(profile.code),
        profileAmounts[profile.code],
        "CONFIGURED",
      );
    for (const combination of combinations)
      await insertPrice(
        "COMBINATION",
        "lab_combination_id",
        combinationIds.get(combination.code),
        combinationAmounts[combination.code],
        "CONFIGURED",
      );
    await connection.execute(
      "INSERT INTO audit_logs(id,user_id,action,entity,entity_id,details,new_data) VALUES(?,?,'LAB_CATALOG_IMPORTED','LAB_CATALOG_IMPORT',?,?,?)",
      [
        randomUUID(),
        actor.id,
        expectedWorkbookHash,
        `Imported the approved Red Crescent laboratory catalog: ${Object.values(counts).reduce((a, b) => a + b, 0)} records effective ${clock.effectiveAt} PKT.`,
        JSON.stringify({
          sourceWorkbookSha256: expectedWorkbookHash,
          manifestSha256: expectedManifestHash,
          effectiveAt: clock.effectiveAt,
          timeZone: "PKT",
          counts,
        }),
      ],
    );
    await connection.commit();
    return {
      effectiveAt: clock.effectiveAt,
      sessionTimeZone: clock.sessionTimeZone,
      systemTimeZone: clock.systemTimeZone,
      auditRecords: 1,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

try {
  const counts = await validateManifest();
  const preflight = await livePreflight(counts);
  if (!execute)
    console.log(
      JSON.stringify({ mode: "DRY_RUN", counts, ...preflight }, null, 2),
    );
  else
    console.log(
      JSON.stringify(
        {
          mode: "EXECUTED",
          counts,
          ...preflight,
          result: await importCatalog(counts),
        },
        null,
        2,
      ),
    );
} finally {
  await database.end();
}
