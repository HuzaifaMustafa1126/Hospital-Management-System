import { randomUUID } from "node:crypto";
import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";

async function actorDoctor(connection, userId) {
  const [rows] = await connection.execute("SELECT id FROM doctors WHERE user_id=? AND is_active=TRUE", [userId]);
  if (!rows.length) throw new AppError(403, "Your account is not linked to an active doctor profile.");
  return rows[0].id;
}

export const doctorWorkflowService = {
  async availableServices(visitId,userId){const doctorId=await actorDoctor(database,userId);const [rows]=await database.execute(`SELECT s.id,s.name,s.code,s.description,s.workflow_key AS workflowKey FROM patient_visits v JOIN doctor_departments dd ON dd.department_id=v.department_id AND dd.doctor_id=? AND dd.is_active=TRUE JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? JOIN department_services ds ON ds.department_id=v.department_id JOIN services s ON s.id=ds.service_id AND s.is_active=TRUE AND s.doctor_selectable=TRUE WHERE v.id=? AND v.doctor_id=? AND v.status IN ('IN_CONSULTATION','SHORT_STAY') ORDER BY s.name`,[doctorId,userId,visitId,doctorId]);return rows;},
  async details(visitId,userId){
    const doctorId=await actorDoctor(database,userId);
    const [rows]=await database.execute(`SELECT v.id AS visitId,v.visit_number AS visitNumber,v.visit_date AS visitDate,v.status,v.doctor_id AS assignedDoctorId,v.claimed_at AS claimedAt,dep.id AS departmentId,dep.name AS departmentName,p.id AS patientId,p.patient_number AS patientNumber,p.first_name AS firstName,p.last_name AS lastName,p.father_name AS fatherName,p.age,p.gender,p.cnic,p.phone,p.address,CASE WHEN assigned.id IS NULL THEN NULL ELSE CONCAT('Dr. ',assigned.first_name,' ',assigned.last_name) END AS assignedDoctorName FROM patient_visits v JOIN patients p ON p.id=v.patient_id JOIN departments dep ON dep.id=v.department_id JOIN doctor_departments dd ON dd.department_id=v.department_id AND dd.doctor_id=? AND dd.is_active=TRUE JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? LEFT JOIN doctors assigned ON assigned.id=v.doctor_id WHERE v.id=?`,[doctorId,userId,visitId]);
    if(!rows.length)throw new AppError(403,'You cannot access this patient visit.');
    const [services]=await database.execute(`SELECT ps.id,s.name AS serviceName,s.code AS serviceCode,ps.notes,ps.quantity,ps.status,ps.created_at AS createdAt FROM patient_services ps JOIN services s ON s.id=ps.service_id WHERE ps.visit_id=? ORDER BY ps.created_at DESC`,[visitId]);
    const [orders]=await database.execute(`SELECT o.id,'Short Stay' AS serviceName,o.medicine_name AS medicineName,o.dose,o.route,o.quantity,o.status,o.created_at AS createdAt FROM short_stay_orders o WHERE o.visit_id=? ORDER BY o.created_at DESC`,[visitId]);
    return {...rows[0],isAssignedToCurrentDoctor:Number(rows[0].assignedDoctorId)===Number(doctorId),services:[...services,...orders]};
  },
  async queue(userId, search = "") {
    const doctorId = await actorDoctor(database, userId);
    const term = `%${search.trim()}%`;
    const [rows] = await database.execute(`SELECT v.id,v.visit_number AS visitNumber,v.visit_date AS visitDate,v.status,v.department_id AS departmentId,dep.name AS departmentName,p.id AS patientId,p.patient_number AS patientNumber,CONCAT(p.first_name,' ',p.last_name) AS patientName,p.cnic,p.phone FROM patient_visits v JOIN patients p ON p.id=v.patient_id JOIN departments dep ON dep.id=v.department_id JOIN doctor_departments dd ON dd.department_id=v.department_id AND dd.doctor_id=? AND dd.is_active=TRUE JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? WHERE v.status IN ('WAITING','IN_CONSULTATION','SHORT_STAY') AND (v.doctor_id IS NULL OR v.doctor_id=?) AND (?='' OR p.patient_number LIKE ? OR p.cnic LIKE ? OR p.phone LIKE ? OR CONCAT(p.first_name,' ',p.last_name) LIKE ?) ORDER BY FIELD(v.status,'IN_CONSULTATION','SHORT_STAY','WAITING'),v.created_at`, [doctorId,userId,doctorId,search.trim(),term,term,term,term]);
    return rows;
  },
  async claim(visitId, userId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const doctorId = await actorDoctor(connection, userId);
      const [result] = await connection.execute(`UPDATE patient_visits v JOIN doctor_departments dd ON dd.department_id=v.department_id AND dd.doctor_id=? AND dd.is_active=TRUE JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? SET v.doctor_id=?,v.status='IN_CONSULTATION',v.claimed_at=NOW() WHERE v.id=? AND v.doctor_id IS NULL AND v.status='WAITING'`, [doctorId,userId,doctorId,visitId]);
      if (result.affectedRows !== 1) throw new AppError(409, "This patient has already been assigned to another doctor.");
      await connection.execute("INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'VISIT_CLAIMED','PATIENT_VISIT',?,?)", [randomUUID(),userId,String(visitId),JSON.stringify({ doctorId, status: "IN_CONSULTATION" })]);
      await connection.commit();
      return { id: Number(visitId), doctorId, status: "IN_CONSULTATION" };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
  async addShortStay(visitId, data, userId) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const doctorId = await actorDoctor(connection, userId);
      const [visits] = await connection.execute("SELECT v.patient_id AS patientId,v.status,v.department_id AS departmentId FROM patient_visits v JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? WHERE v.id=? AND v.doctor_id=? FOR UPDATE", [userId,visitId,doctorId]);
      if (!visits.length) throw new AppError(403, "You are not assigned to this visit.");
      if (!['IN_CONSULTATION','SHORT_STAY'].includes(visits[0].status)) throw new AppError(409, "Short-stay orders require an active consultation.");
      const [availability]=await connection.execute("SELECT s.id FROM services s JOIN department_services ds ON ds.service_id=s.id WHERE s.code='SHORT_STAY' AND s.workflow_key='SHORT_STAY' AND s.is_active=TRUE AND s.doctor_selectable=TRUE AND ds.department_id=?",[visits[0].departmentId]);
      if(!availability.length)throw new AppError(403,'Short Stay is not active or available for this visit department.');
      const [result] = await connection.execute("INSERT INTO short_stay_orders (patient_id,visit_id,doctor_id,medicine_name,dose,route,quantity) VALUES (?,?,?,?,?,?,?)", [visits[0].patientId,visitId,doctorId,data.medicineName,data.dose,data.route,data.quantity]);
      await connection.execute("UPDATE patient_visits SET status='SHORT_STAY' WHERE id=?", [visitId]);
      await connection.execute("INSERT INTO audit_logs (id,user_id,action,entity,entity_id,new_data) VALUES (?,?,'SHORT_STAY_ORDER_CREATED','SHORT_STAY_ORDER',?,?)", [randomUUID(),userId,String(result.insertId),JSON.stringify({ visitId:Number(visitId),doctorId,...data,status:'ORDERED' })]);
      await connection.commit();
      return { id: result.insertId, visitId:Number(visitId), doctorId, ...data, status:'ORDERED' };
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },
  async orders(visitId, userId) {
    const doctorId = await actorDoctor(database, userId);
    const [access] = await database.execute("SELECT v.id FROM patient_visits v JOIN doctor_departments dd ON dd.department_id=v.department_id AND dd.doctor_id=? AND dd.is_active=TRUE JOIN user_departments ud ON ud.department_id=v.department_id AND ud.user_id=? WHERE v.id=?", [doctorId,userId,visitId]);
    if (!access.length) throw new AppError(403, "You cannot access this visit.");
    const [rows] = await database.execute("SELECT o.id,o.visit_id AS visitId,o.medicine_name AS medicineName,o.dose,o.route,o.quantity,o.status,o.created_at AS createdAt,CONCAT('Dr. ',d.first_name,' ',d.last_name) AS doctorName FROM short_stay_orders o JOIN doctors d ON d.id=o.doctor_id WHERE o.visit_id=? ORDER BY o.created_at DESC", [visitId]);
    return rows;
  },
};
