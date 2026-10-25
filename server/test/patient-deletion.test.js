import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { database } from "../src/db/database.js";
import { canDeletePatient } from "../src/routes/patient.routes.js";
import { patientService } from "../src/services/patient.service.js";

let actorId;
let departmentId;
const createdPatientIds = new Set();

async function createPatient(classification = "TEST") {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  const patientNumber = `TDEL-${suffix}`;
  const [result] = await database.execute(
    `INSERT INTO patients
      (patient_number, first_name, last_name, father_name, gender, age, cnic, phone, address, doctor_id, created_by, registration_locked, is_active, record_classification)
     VALUES (?, 'Deletion', 'Integration Test', 'Synthetic', 'MALE', 30, ?, ?, 'Synthetic test record', NULL, ?, TRUE, TRUE, ?)`,
    [patientNumber, `97${suffix}9`, `+923${suffix}`, actorId, classification],
  );
  createdPatientIds.add(result.insertId);
  return { id: result.insertId, patientNumber, cnic: `97${suffix}9` };
}

async function cleanPatient(id) {
  for (const [table, column] of [
    ["bill_payments", "patient_id"], ["short_stay_orders", "patient_id"],
    ["patient_services", "patient_id"], ["registration_payments", "patient_id"],
    ["visit_bills", "patient_id"], ["consultations", "patient_id"],
    ["patient_visits", "patient_id"], ["patient_registration_audit", "patient_id"],
  ]) await database.execute(`DELETE FROM ${table} WHERE ${column}=?`, [id]);
  await database.execute("DELETE FROM patients WHERE id=?", [id]);
}

before(async () => {
  [[{ id: actorId }]] = await database.execute("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name='SUPER_ADMIN' LIMIT 1");
  [[{ id: departmentId }]] = await database.execute("SELECT id FROM departments LIMIT 1");
  assert.ok(actorId && departmentId, "Test database requires a Super Admin and department");
});

after(async () => {
  await database.query("DROP TRIGGER IF EXISTS test_patient_delete_rollback");
  for (const id of createdPatientIds) await cleanPatient(id);
  await database.end();
});

test("authorization accepts Super Admin or explicit permission and rejects others", () => {
  for (const user of [{ roles: ["SUPER_ADMIN"], permissions: [] }, { roles: ["RECEPTION"], permissions: ["PATIENT_DELETE"] }]) {
    let error;
    canDeletePatient({ user }, null, (value) => { error = value; });
    assert.equal(error, undefined);
  }
  let forbidden;
  canDeletePatient({ user: { roles: ["RECEPTION"], permissions: [] } }, null, (value) => { forbidden = value; });
  assert.equal(forbidden.statusCode, 403);
});

test("incorrect CNIC confirmation is rejected without deleting the patient", async () => {
  const patient = await createPatient("REAL");
  await assert.rejects(() => patientService.permanentDelete(patient.id, { cnic: "00000-0000000-0" }, actorId), (error) => error.statusCode === 400);
  const [[remaining]] = await database.execute("SELECT COUNT(*) total FROM patients WHERE id=?", [patient.id]);
  assert.equal(Number(remaining.total), 1);
});

test("TEST deletion removes owned records without changing shared masters", async () => {
  const patient = await createPatient();
  const [[before]] = await database.execute("SELECT (SELECT COUNT(*) FROM departments) departments,(SELECT COUNT(*) FROM doctors) doctors,(SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM services) services");
  const [visit] = await database.execute("INSERT INTO patient_visits(patient_id,department_id,visit_number,visit_date,registration_fee_snapshot,fee_type,created_by,status) VALUES(?,?,1,CURDATE(),0,'FREE',?,'WAITING')", [patient.id, departmentId, actorId]);
  await database.execute("INSERT INTO registration_payments(patient_id,visit_id,receipt_number,amount,fee_type,payment_method,payment_status,received_by) VALUES(?,?,?,0,'FREE','CASH','PAID',?)", [patient.id, visit.insertId, `TREC-${Date.now()}`, actorId]);
  await database.execute("INSERT INTO patient_registration_audit(patient_id,user_id,action,new_data) VALUES(?,?,'CREATED',JSON_OBJECT('test',TRUE))", [patient.id, actorId]);
  await database.execute("INSERT INTO visit_bills(visit_id,patient_id,visit_fee,services_total,total_amount,created_by) VALUES(?,?,0,0,0,?)", [visit.insertId, patient.id, actorId]);
  const result = await patientService.permanentDelete(patient.id, { cnic: patient.cnic }, actorId);
  createdPatientIds.delete(patient.id);
  assert.equal(result.counts.visits, 1);
  for (const [table, column] of [["patients", "id"], ["patient_visits", "patient_id"], ["visit_bills", "patient_id"], ["registration_payments", "patient_id"], ["patient_registration_audit", "patient_id"]]) {
    const [[row]] = await database.execute(`SELECT COUNT(*) total FROM ${table} WHERE ${column}=?`, [patient.id]);
    assert.equal(Number(row.total), 0, `${table} retained patient-owned rows`);
  }
  const [[afterCounts]] = await database.execute("SELECT (SELECT COUNT(*) FROM departments) departments,(SELECT COUNT(*) FROM doctors) doctors,(SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM services) services");
  assert.deepEqual(afterCounts, before);
});

test("REAL patient can be deleted after exact CNIC confirmation", async () => {
  const patient = await createPatient("REAL");
  await patientService.permanentDelete(patient.id, { cnic: patient.cnic }, actorId);
  createdPatientIds.delete(patient.id);
  const [[remaining]] = await database.execute("SELECT COUNT(*) total FROM patients WHERE id=?", [patient.id]);
  assert.equal(Number(remaining.total), 0);
});

test("transaction rollback restores child rows when patient deletion fails", async () => {
  const patient = await createPatient();
  await database.execute("INSERT INTO patient_visits(patient_id,department_id,visit_number,visit_date,registration_fee_snapshot,fee_type,created_by,status) VALUES(?,?,1,CURDATE(),0,'FREE',?,'WAITING')", [patient.id, departmentId, actorId]);
  await database.query("DROP TRIGGER IF EXISTS test_patient_delete_rollback");
  await database.query("CREATE TRIGGER test_patient_delete_rollback BEFORE DELETE ON patients FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced rollback test'");
  await assert.rejects(() => patientService.permanentDelete(patient.id, { cnic: patient.cnic }, actorId));
  await database.query("DROP TRIGGER test_patient_delete_rollback");
  const [[patientRow]] = await database.execute("SELECT COUNT(*) total FROM patients WHERE id=?", [patient.id]);
  const [[visitRow]] = await database.execute("SELECT COUNT(*) total FROM patient_visits WHERE patient_id=?", [patient.id]);
  assert.equal(Number(patientRow.total), 1);
  assert.equal(Number(visitRow.total), 1);
});
