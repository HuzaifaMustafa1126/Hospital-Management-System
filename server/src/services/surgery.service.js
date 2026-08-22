import { database } from "../db/database.js";

export const surgeryService = {
  async overview() {
    const [
      [serviceCount],
      [activeCount],
      [todayCount],
      [services],
      [activity],
    ] = await Promise.all([
      database.execute(
        "SELECT COUNT(*) total FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR'",
      ),
      database.execute(
        "SELECT COUNT(*) total FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND s.is_active=TRUE",
      ),
      database.execute(
        "SELECT COUNT(*) total FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' AND DATE(ps.created_at)=CURDATE()",
      ),
      database.execute(
        "SELECT s.id,s.name,s.code,s.description,s.price,s.is_active AS isActive FROM services s JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' ORDER BY s.name",
      ),
      database.execute(
        "SELECT ps.id, s.name AS serviceName, ps.created_at AS createdAt FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE d.code='SUR' ORDER BY ps.created_at DESC LIMIT 6",
      ),
    ]);
    return {
      serviceCount: Number(serviceCount[0].total),
      activeCount: Number(activeCount[0].total),
      todayCount: Number(todayCount[0].total),
      services: services.map((s) => ({
        ...s,
        price: Number(s.price),
        isActive: Boolean(s.isActive),
      })),
      activity,
    };
  },
};
