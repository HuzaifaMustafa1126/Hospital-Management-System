import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";

const select = `SELECT d.id,d.name,d.code,d.description,d.registration_fee AS registrationFee,d.accepts_registration AS acceptsRegistration,d.is_active AS isActive,d.deleted_at AS deletedAt,d.created_at AS createdAt,d.updated_at AS updatedAt,d.created_by AS createdBy,COUNT(DISTINCT ds.service_id) serviceCount,COUNT(DISTINCT CASE WHEN dd.is_active=TRUE THEN dd.doctor_id END) assignedDoctorCount,COUNT(DISTINCT v.id) visitCount,COUNT(DISTINCT CASE WHEN v.status IN ('WAITING','IN_CONSULTATION','SHORT_STAY') THEN v.id END) activeVisitCount FROM departments d LEFT JOIN department_services ds ON ds.department_id=d.id LEFT JOIN doctor_departments dd ON dd.department_id=d.id LEFT JOIN patient_visits v ON v.department_id=d.id`;
const group = " GROUP BY d.id";
const present = (row) => ({ ...row, registrationFee: Number(row.registrationFee), acceptsRegistration: Boolean(row.acceptsRegistration), isActive: Boolean(row.isActive), serviceCount: Number(row.serviceCount), assignedDoctorCount: Number(row.assignedDoctorCount), visitCount: Number(row.visitCount), activeVisitCount: Number(row.activeVisitCount) });
const clauses = ({ search, status, registrationOnly }) => { const conditions = ["d.deleted_at IS NULL"], params = []; if (search) { conditions.push("(d.name LIKE ? OR d.code LIKE ?)"); params.push(`%${search}%`, `%${search}%`); } if (status === "active") conditions.push("d.is_active=TRUE"); if (status === "inactive") conditions.push("d.is_active=FALSE"); if (registrationOnly) conditions.push("d.accepts_registration=TRUE"); return { where: ` WHERE ${conditions.join(" AND ")}`, params }; };

async function getDepartment(id, connection = database) {
  const [rows] = await connection.execute(`${select} WHERE d.id=? AND d.deleted_at IS NULL${group}`, [id]);
  if (!rows.length) throw new AppError(404, "Department not found.");
  return present(rows[0]);
}

const countQueries = {
  visits: "SELECT COUNT(*) total FROM patient_visits WHERE department_id=?",
  activeVisits: "SELECT COUNT(*) total FROM patient_visits WHERE department_id=? AND status IN ('WAITING','IN_CONSULTATION','SHORT_STAY')",
  doctorAssignments: "SELECT COUNT(*) total FROM doctor_departments WHERE department_id=?",
  activeDoctorAssignments: "SELECT COUNT(*) total FROM doctor_departments WHERE department_id=? AND is_active=TRUE",
  staffAssignments: "SELECT COUNT(*) total FROM user_departments WHERE department_id=?",
  serviceAssociations: "SELECT COUNT(*) total FROM department_services WHERE department_id=?",
  legacyServiceReferences: "SELECT COUNT(*) total FROM services WHERE department_id=?",
  consultations: "SELECT COUNT(*) total FROM consultations c JOIN patient_visits v ON v.id=c.visit_id WHERE v.department_id=?",
  bills: "SELECT COUNT(*) total FROM visit_bills b JOIN patient_visits v ON v.id=b.visit_id WHERE v.department_id=?",
};

export async function getDepartmentDeletionImpact(departmentId, connection = database) {
  const department = await getDepartment(departmentId, connection), dependencies = {};
  for (const [key, sql] of Object.entries(countQueries)) {
    try { const [rows] = await connection.execute(sql, [departmentId]); dependencies[key] = Number(rows[0].total); }
    catch (error) { if (error.code === "ER_NO_SUCH_TABLE") dependencies[key] = 0; else throw error; }
  }
  const historical = dependencies.visits > 0 || dependencies.consultations > 0 || dependencies.bills > 0;
  const assignments = dependencies.doctorAssignments > 0 || dependencies.staffAssignments > 0;
  const serviceLinks = dependencies.serviceAssociations > 0 || dependencies.legacyServiceReferences > 0;
  const blockingReasons = [];
  if (dependencies.visits) blockingReasons.push(`${dependencies.visits} historical patient visit(s) reference this department.`);
  if (dependencies.consultations) blockingReasons.push(`${dependencies.consultations} consultation record(s) reference visits in this department.`);
  if (dependencies.bills) blockingReasons.push(`${dependencies.bills} bill record(s) reference visits in this department.`);
  if (dependencies.doctorAssignments) blockingReasons.push(`${dependencies.doctorAssignments} doctor assignment row(s), including inactive assignments, reference this department.`);
  if (dependencies.staffAssignments) blockingReasons.push(`${dependencies.staffAssignments} staff assignment row(s) reference this department.`);
  if (dependencies.serviceAssociations) blockingReasons.push(`${dependencies.serviceAssociations} department-service availability mapping(s) reference this department.`);
  if (dependencies.legacyServiceReferences) blockingReasons.push(`${dependencies.legacyServiceReferences} legacy service row(s) use this department as their primary department.`);
  return { department, canDelete: !historical && !assignments && !serviceLinks, hasHistoricalRecords: historical, dependencies, blockingReasons, resolutions: { canRemoveAssignments: !historical && assignments, canRemoveServiceMappings: !historical && serviceLinks } };
}

function dependencyError(impact, message = "Department cannot be deleted.") {
  const error = new AppError(409, message, [{ impact }]);
  error.code = "DEPARTMENT_HAS_DEPENDENCIES";
  error.impact = impact;
  return error;
}

export const departmentService = {
  async list(query) { const { where, params } = clauses(query), offset = (query.page - 1) * query.limit, order = query.sort === "fee" ? "d.registration_fee" : "d.name", direction = query.direction === "desc" ? "DESC" : "ASC"; const [[rows], [counts]] = await Promise.all([database.execute(`${select}${where}${group} ORDER BY ${order} ${direction} LIMIT ${query.limit} OFFSET ${offset}`, params), database.execute(`SELECT COUNT(*) total FROM departments d${where}`, params)]); const total = Number(counts[0].total); return { departments: rows.map(present), pagination: { page: query.page, limit: query.limit, total, totalPages: total ? Math.ceil(total / query.limit) : 0 } }; },
  async get(id, connection = database) { return getDepartment(id, connection); },
  async create(data, userId) { const [existing] = await database.execute("SELECT id FROM departments WHERE code=? OR LOWER(name)=LOWER(?)", [data.code, data.name]); if (existing.length) throw new AppError(409, "Department name or code already exists."); const [result] = await database.execute("INSERT INTO departments(name,code,description,registration_fee,accepts_registration,is_active,created_by) VALUES(?,?,?,?,TRUE,?,?)", [data.name, data.code, data.description || null, data.registrationFee, data.isActive, userId]); return this.get(result.insertId); },
  async update(id, data) { const current = await this.get(id); if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) { const [existing] = await database.execute("SELECT id FROM departments WHERE LOWER(name)=LOWER(?) AND id<>?", [data.name, id]); if (existing.length) throw new AppError(409, "Department name already exists."); } const fields = { name: "name", description: "description", registrationFee: "registration_fee", isActive: "is_active" }, changes = Object.entries(fields).filter(([key]) => key in data); if (changes.length) await database.execute(`UPDATE departments SET ${changes.map(([, column]) => `${column}=?`).join(",")} WHERE id=?`, [...changes.map(([key]) => data[key] === "" ? null : data[key]), id]); return { old: current, department: await this.get(id) }; },
  async setStatus(id, isActive) { const current = await this.get(id); await database.execute("UPDATE departments SET is_active=? WHERE id=?", [isActive, id]); return { old: current, department: await this.get(id), activeVisitCount: current.activeVisitCount }; },
  async deletionImpact(id, connection = database) { return getDepartmentDeletionImpact(id, connection); },
  async removeAssignments(id) { const impact = await this.deletionImpact(id); if (impact.hasHistoricalRecords) throw dependencyError(impact, "Assignments cannot be removed while historical records exist."); const connection = await database.getConnection(); try { await connection.beginTransaction(); await connection.execute("SELECT id FROM departments WHERE id=? FOR UPDATE", [id]); await connection.execute("DELETE FROM doctor_departments WHERE department_id=?", [id]); await connection.execute("DELETE FROM user_departments WHERE department_id=?", [id]); await connection.commit(); return this.deletionImpact(id); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } },
  async removeServiceMappings(id) { const impact = await this.deletionImpact(id); if (impact.hasHistoricalRecords) throw dependencyError(impact, "Service mappings cannot be removed while historical records exist."); const connection = await database.getConnection(); try { await connection.beginTransaction(); await connection.execute("SELECT id FROM departments WHERE id=? FOR UPDATE", [id]); await connection.execute("DELETE FROM department_services WHERE department_id=?", [id]); await connection.execute("UPDATE services s SET s.department_id=(SELECT MIN(ds.department_id) FROM department_services ds WHERE ds.service_id=s.id) WHERE s.department_id=?", [id]); await connection.commit(); return this.deletionImpact(id); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); } },
  async remove(id) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("SELECT id FROM departments WHERE id=? FOR UPDATE", [id]);
      const impact = await getDepartmentDeletionImpact(id, connection);
      if (!impact.canDelete) throw dependencyError(impact, impact.hasHistoricalRecords ? "Department cannot be deleted because historical patient or financial records exist." : "Department cannot be deleted until its administrative dependencies are resolved.");
      await connection.execute("DELETE FROM departments WHERE id=?", [id]);
      await connection.commit();
      return impact.department;
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        const impact = await getDepartmentDeletionImpact(id);
        const constraint = error.sqlMessage?.match(/CONSTRAINT `([^`]+)`/)?.[1] || "unknown foreign key";
        impact.blockingReasons.push(`Database constraint ${constraint} still references this department.`);
        const conflict = dependencyError(impact, `Department cannot be deleted because ${constraint} still has dependent records.`);
        conflict.constraint = constraint;
        throw conflict;
      }
      throw error;
    } finally { connection.release(); }
  },
};
