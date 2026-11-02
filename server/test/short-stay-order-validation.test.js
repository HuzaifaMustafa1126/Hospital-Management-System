import assert from "node:assert/strict";
import test from "node:test";
import { shortStayOrderSchema } from "../src/validators/visit.validator.js";

test("legacy single short-stay order payload remains supported", () => {
  const result = shortStayOrderSchema.parse({ medicineName: "  Ceftriaxone  ", dose: "1 g", route: "IV", quantity: "1 vial" });
  assert.deepEqual(result, [{ medicineName: "Ceftriaxone", dose: "1 g", route: "IV", quantity: "1 vial" }]);
});

test("bulk short-stay payload validates and normalizes every entry", () => {
  const result = shortStayOrderSchema.parse({ orders: [
    { medicineName: "Normal saline", route: "IV" },
    { medicineName: "Diclofenac", dose: "75 mg", route: "IM", quantity: "1 ampoule" },
  ] });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { medicineName: "Normal saline", dose: "", route: "IV", quantity: "" });
});

test("bulk short-stay payload rejects an invalid entry with its index", () => {
  assert.throws(
    () => shortStayOrderSchema.parse({ orders: [
      { medicineName: "Valid", route: "IV" },
      { medicineName: " ", route: "ORAL" },
    ] }),
    (error) => error.issues.some((issue) => issue.path[0] === "orders" && issue.path[1] === 1),
  );
});

