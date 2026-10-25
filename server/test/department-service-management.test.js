import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { database } from "../src/db/database.js";
import { departmentService } from "../src/services/department.service.js";
import { serviceService } from "../src/services/service.service.js";

let actorId;
const departmentIds = new Set();
const serviceIds = new Set();
const patientIds = new Set();

async function createDepartment(label) {
  const code = `T${label}${String(Date.now()).slice(-7)}`.slice(0, 30).toUpperCase();
  const department = await departmentService.create({ name: `Test ${label} ${code}`, code, description: "Automated integration test", registrationFee: 0, isActive: true }, actorId);
  departmentIds.add(department.id);
  return department;
}

before(async () => {
  [[{ id: actorId }]] = await database.execute("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name='SUPER_ADMIN' LIMIT 1");
  assert.ok(actorId);
});

after(async () => {
  for (const id of serviceIds) { await database.execute("DELETE FROM department_services WHERE service_id=?", [id]); await database.execute("DELETE FROM services WHERE id=?", [id]); }
  for (const id of departmentIds) { await database.execute("DELETE FROM doctor_departments WHERE department_id=?", [id]); await database.execute("DELETE FROM user_departments WHERE department_id=?", [id]); await database.execute("DELETE FROM department_services WHERE department_id=?", [id]); await database.execute("DELETE FROM departments WHERE id=?", [id]); }
  for (const id of patientIds) { await database.execute("DELETE FROM patient_visits WHERE patient_id=?", [id]); await database.execute("DELETE FROM patients WHERE id=?", [id]); }
  await database.end();
});

test("empty department can be permanently deleted", async () => {
  const department = await createDepartment("Empty");
  assert.equal((await departmentService.deletionImpact(department.id)).canDelete, true);
  await departmentService.remove(department.id); departmentIds.delete(department.id);
});

test("service create, multi-department assignment, edit, fee snapshot policy, status, and delete", async () => {
  const first = await createDepartment("ServiceA"), second = await createDepartment("ServiceB");
  const code = `TEST_SERVICE_${String(Date.now()).slice(-8)}`;
  const service = await serviceService.create({ name: "Test Dynamic Service", code, description: "Test", price: 125, departmentIds: [first.id, second.id], isActive: true }, actorId);
  serviceIds.add(service.id);
  assert.equal(service.departments.length, 2); assert.equal(service.price, 125);
  await assert.rejects(() => serviceService.create({ name: "Duplicate", code, price: 1, departmentIds: [first.id], isActive: true }, actorId), (error) => error.statusCode === 409);
  const updated = (await serviceService.update(service.id, { name: "Updated Dynamic Service", price: 225, departmentIds: [second.id] })).service;
  assert.equal(updated.code, code); assert.equal(updated.price, 225); assert.deepEqual(updated.departments.map((item) => Number(item.id)), [Number(second.id)]);
  assert.equal((await serviceService.setStatus(service.id, false)).service.isActive, false);
  assert.equal((await serviceService.deletionImpact(service.id)).canDelete, true);
  await serviceService.remove(service.id); serviceIds.delete(service.id);
});

test("department reports removable service mappings separately from history", async () => {
  const department = await createDepartment("Mappings");
  const service = await serviceService.create({ name: "Mapping Test", code: `MAP_${Date.now()}`, price: 0, departmentIds: [department.id], isActive: true }, actorId);
  serviceIds.add(service.id);
  const impact = await departmentService.deletionImpact(department.id);
  assert.equal(impact.hasHistoricalRecords, false); assert.equal(impact.dependencies.serviceAssociations, 1); assert.equal(impact.resolutions.canRemoveServiceMappings, true);
  await departmentService.removeServiceMappings(department.id);
  assert.equal((await departmentService.deletionImpact(department.id)).canDelete, true);
  await departmentService.remove(department.id); departmentIds.delete(department.id);
  await serviceService.remove(service.id); serviceIds.delete(service.id);
});

test("department with historical visits is blocked and patient history remains", async () => {
  const department = await createDepartment("History");
  const suffix = String(Date.now()).slice(-9);
  const [patientResult] = await database.execute("INSERT INTO patients(patient_number,first_name,last_name,father_name,gender,age,cnic,phone,address,doctor_id,created_by,registration_locked,is_active,record_classification) VALUES(?,'Department','History Test','Synthetic','MALE',30,?,?, 'Synthetic integration test',NULL,?,TRUE,TRUE,'TEST')", [`TDH-${suffix}`, `96${suffix}96`, `+923${suffix}`, actorId]);
  patientIds.add(patientResult.insertId);
  const [visit] = await database.execute("INSERT INTO patient_visits(patient_id,department_id,visit_number,visit_date,registration_fee_snapshot,fee_type,created_by,status) VALUES(?,?,1,CURDATE(),0,'FREE',?,'COMPLETED')", [patientResult.insertId, department.id, actorId]);
  const impact = await departmentService.deletionImpact(department.id);
  assert.equal(impact.hasHistoricalRecords, true); assert.equal(impact.dependencies.visits, 1);
  await assert.rejects(() => departmentService.remove(department.id), (error) => error.statusCode === 409);
  const [[stillThere]] = await database.execute("SELECT COUNT(*) total FROM patient_visits WHERE id=?", [visit.insertId]); assert.equal(Number(stillThere.total), 1);
  await database.execute("DELETE FROM patient_visits WHERE id=?", [visit.insertId]);
  await database.execute("DELETE FROM patients WHERE id=?", [patientResult.insertId]); patientIds.delete(patientResult.insertId);
  await departmentService.remove(department.id); departmentIds.delete(department.id);
});

test("Short Stay is the only doctor-selectable workflow and retains separate pricing", async () => {
  const [rows] = await database.execute("SELECT code,workflow_key AS workflowKey,doctor_selectable AS doctorSelectable,price FROM services WHERE doctor_selectable=TRUE AND is_active=TRUE");
  assert.deepEqual(rows.map((row) => row.code), ["SHORT_STAY"]);
  assert.equal(rows[0].workflowKey, "SHORT_STAY"); assert.equal(Number(rows[0].price), 0);
});
