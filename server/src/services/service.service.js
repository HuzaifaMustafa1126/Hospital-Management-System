import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";

const baseSelect = `SELECT s.id,s.name,s.code,s.description,s.price,s.workflow_key AS workflowKey,s.doctor_selectable AS doctorSelectable,s.is_active AS isActive,s.created_at AS createdAt,s.updated_at AS updatedAt,s.created_by AS createdBy FROM services s`;
const present = (row, departments = []) => ({ ...row, price: Number(row.price), isActive: Boolean(row.isActive), doctorSelectable: Boolean(row.doctorSelectable), departments });

async function departmentsByService(serviceIds, connection = database) {
  if (!serviceIds.length) return new Map();
  const placeholders = serviceIds.map(() => "?").join(",");
  const [rows] = await connection.execute(`SELECT ds.service_id AS serviceId,d.id,d.name,d.code FROM department_services ds JOIN departments d ON d.id=ds.department_id WHERE ds.service_id IN (${placeholders}) ORDER BY d.name`, serviceIds);
  const grouped = new Map(serviceIds.map((id) => [Number(id), []]));
  for (const row of rows) grouped.get(Number(row.serviceId))?.push({ id: row.id, name: row.name, code: row.code });
  return grouped;
}
async function validateDepartments(connection, departmentIds) {
  const placeholders = departmentIds.map(() => "?").join(",");
  const [rows] = await connection.execute(`SELECT id FROM departments WHERE id IN (${placeholders}) AND is_active=TRUE AND deleted_at IS NULL`, departmentIds);
  if (rows.length !== departmentIds.length) throw new AppError(400, "One or more selected departments are invalid or inactive.", [], "departmentIds");
}
async function replaceDepartments(connection, serviceId, departmentIds) {
  await validateDepartments(connection, departmentIds);
  await connection.execute("DELETE FROM department_services WHERE service_id=?", [serviceId]);
  for (const departmentId of departmentIds) await connection.execute("INSERT INTO department_services(department_id,service_id) VALUES(?,?)", [departmentId, serviceId]);
  await connection.execute("UPDATE services SET department_id=? WHERE id=?", [departmentIds[0], serviceId]);
}

export const serviceService = {
  async analytics(range = "30d") {
    const days = ({ today: 0, "7d": 6, "30d": 29 })[range] ?? 29;
    const [rows] = await database.execute(`SELECT d.name AS department,COUNT(ps.id) total FROM departments d LEFT JOIN patient_visits v ON v.department_id=d.id LEFT JOIN patient_services ps ON ps.visit_id=v.id AND ps.created_at>=CURDATE()-INTERVAL ? DAY AND ps.created_at<CURDATE()+INTERVAL 1 DAY GROUP BY d.id,d.name ORDER BY total DESC`, [days]);
    return { range, total: rows.reduce((sum, row) => sum + Number(row.total), 0), departments: rows.map((row) => ({ department: row.department, total: Number(row.total) })) };
  },
  async list({ page, limit, search, status, departmentId }) {
    const conditions = [], params = [];
    if (search) { conditions.push("(s.name LIKE ? OR s.code LIKE ? OR s.description LIKE ?)"); const term = `%${search}%`; params.push(term, term, term); }
    if (status === "active") conditions.push("s.is_active=TRUE");
    if (status === "inactive") conditions.push("s.is_active=FALSE");
    if (departmentId) { conditions.push("EXISTS(SELECT 1 FROM department_services ds WHERE ds.service_id=s.id AND ds.department_id=?)"); params.push(departmentId); }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "", offset = (page - 1) * limit;
    const [[rows], [countRows]] = await Promise.all([database.execute(`${baseSelect}${where} ORDER BY s.name LIMIT ${limit} OFFSET ${offset}`, params), database.execute(`SELECT COUNT(*) total FROM services s${where}`, params)]);
    const mappings = await departmentsByService(rows.map((row) => row.id));
    const total = Number(countRows[0].total);
    return { services: rows.map((row) => present(row, mappings.get(Number(row.id)) || [])), pagination: { page, limit, total, totalPages: total ? Math.ceil(total / limit) : 0 } };
  },
  async get(id, connection = database) {
    const [rows] = await connection.execute(`${baseSelect} WHERE s.id=?`, [id]);
    if (!rows.length) throw new AppError(404, "Service not found.");
    const mappings = await departmentsByService([rows[0].id], connection);
    return present(rows[0], mappings.get(Number(rows[0].id)) || []);
  },
  async create(data, userId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction(); await validateDepartments(connection, data.departmentIds);
      const [existing] = await connection.execute("SELECT id FROM services WHERE code=?", [data.code]);
      if (existing.length) throw new AppError(409, "Service code already exists.", [], "code");
      const [result] = await connection.execute("INSERT INTO services(department_id,name,code,description,price,is_active,created_by,workflow_key,doctor_selectable) VALUES(?,?,?,?,?,?,?,'GENERIC',FALSE)", [data.departmentIds[0], data.name, data.code, data.description || null, data.price, data.isActive, userId]);
      await replaceDepartments(connection, result.insertId, data.departmentIds); await connection.commit(); return this.get(result.insertId);
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
  async update(id, data) {
    const current = await this.get(id), connection = await database.getConnection();
    try {
      await connection.beginTransaction(); await connection.execute("SELECT id FROM services WHERE id=? FOR UPDATE", [id]);
      const fields = { name: "name", description: "description", price: "price", isActive: "is_active" }, changes = Object.entries(fields).filter(([key]) => key in data);
      if (changes.length) await connection.execute(`UPDATE services SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`, [...changes.map(([key]) => data[key] ?? null), id]);
      if (data.departmentIds) await replaceDepartments(connection, id, data.departmentIds);
      await connection.commit(); return { old: current, service: await this.get(id) };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
  async setStatus(id, isActive) { const current = await this.get(id); await database.execute("UPDATE services SET is_active=? WHERE id=?", [isActive, id]); return { old: current, service: await this.get(id) }; },
  async deletionImpact(id, connection = database) {
    const service = await this.get(id, connection);
    const [usage] = await connection.execute("SELECT COUNT(*) total FROM patient_services WHERE service_id=?", [id]);
    let shortStayOrders = 0;
    if (service.workflowKey === "SHORT_STAY") { const [rows] = await connection.execute("SELECT COUNT(*) total FROM short_stay_orders"); shortStayOrders = Number(rows[0].total); }
    const dependencies = { patientServices: Number(usage[0].total), shortStayOrders };
    return { service, canDelete: !Object.values(dependencies).some(Number), dependencies };
  },
  async remove(id) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction(); await connection.execute("SELECT id FROM services WHERE id=? FOR UPDATE", [id]);
      const impact = await this.deletionImpact(id, connection);
      if (!impact.canDelete) throw new AppError(409, "Service cannot be deleted because it has historical usage. Deactivate it instead.", [{ impact }]);
      await connection.execute("DELETE FROM department_services WHERE service_id=?", [id]); await connection.execute("DELETE FROM services WHERE id=?", [id]);
      await connection.commit(); return impact.service;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
};
