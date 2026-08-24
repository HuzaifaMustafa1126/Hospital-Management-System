import { randomUUID } from "node:crypto";
import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";
import { recalculateVisitBill } from "./visit-billing.service.js";
import { settingsService } from "./settings.service.js";

const money = (value) =>
  Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const billSelect = `SELECT b.id,b.bill_number AS billNumber,b.patient_id AS patientId,b.visit_id AS visitId,b.visit_fee AS visitFee,b.services_total AS servicesTotal,b.total_amount AS grossTotal,b.amount_paid AS amountPaid,b.balance_due AS balanceDue,b.payment_status AS paymentStatus,b.created_at AS createdAt,b.updated_at AS updatedAt,p.patient_number AS patientNumber,p.first_name AS patientFirstName,p.last_name AS patientLastName,p.cnic,v.visit_number AS visitNumber,v.visit_date AS visitDate,v.status AS visitStatus,CONCAT('Dr. ',d.first_name,' ',d.last_name) AS doctorName,rp.fee_type AS feeType FROM visit_bills b JOIN patients p ON p.id=b.patient_id JOIN patient_visits v ON v.id=b.visit_id LEFT JOIN doctors d ON d.id=v.doctor_id LEFT JOIN registration_payments rp ON rp.visit_id=v.id`;
const present = (row) => ({
  ...row,
  visitFee: Number(row.visitFee),
  servicesTotal: Number(row.servicesTotal),
  grossTotal: Number(row.grossTotal),
  amountPaid: Number(row.amountPaid),
  balanceDue: Number(row.balanceDue),
  patientName: `${row.patientFirstName} ${row.patientLastName}`,
});

async function getBill(id, connection = database) {
  const [rows] = await connection.execute(`${billSelect} WHERE b.id=?`, [id]);
  if (!rows.length) throw new AppError(404, "Bill not found.");
  return present(rows[0]);
}

const printableVisitNumber = (visitId, visitDate) =>
  `VIS-${new Date(visitDate).getFullYear()}-${String(visitId).padStart(6, "0")}`;

async function getPrintContext(id) {
  const bill = await billingService.get(id);
  const [details] = await database.execute(
    `SELECT p.father_name AS fatherName,p.phone,p.address,
      CONCAT(creator.first_name,' ',creator.last_name) AS createdBy
     FROM visit_bills b
     JOIN patients p ON p.id=b.patient_id
     JOIN patient_visits v ON v.id=b.visit_id
     LEFT JOIN users creator ON creator.id=v.created_by
     WHERE b.id=?`,
    [id],
  );
  const hospital = await settingsService.getHospital();
  const items = [
    {
      rowKey: "visit-fee",
      description:
        bill.feeType === "FREE"
          ? "Visit Fee (Free)"
          : bill.feeType === "DISCOUNTED"
            ? "Discounted Visit Fee"
            : "Visit Fee",
      code: null,
      department: "Registration",
      quantity: 1,
      unitPrice: bill.visitFee,
      totalAmount: bill.visitFee,
      feeType: bill.feeType,
    },
    ...Object.entries(bill.serviceGroups).flatMap(([department, services]) =>
      services.map((service) => ({
        rowKey: `service-${service.id}`,
        description: service.serviceName,
        code: service.serviceCode,
        department,
        quantity: Number(service.quantity),
        unitPrice: service.unitPrice,
        totalAmount: service.totalAmount,
      })),
    ),
  ];
  let cumulativePaid = 0;
  const paymentsAscending = [...bill.payments].sort(
    (left, right) =>
      new Date(left.paidAt) - new Date(right.paidAt) ||
      left.paymentNumber.localeCompare(right.paymentNumber),
  );
  const paymentsWithBalance = paymentsAscending.map((payment) => {
    cumulativePaid += payment.amount;
    return {
      ...payment,
      remainingBalance: Math.max(bill.grossTotal - cumulativePaid, 0),
    };
  });
  return {
    hospital,
    patient: {
      id: bill.patientId,
      patientNumber: bill.patientNumber,
      name: bill.patientName,
      fatherName: details[0]?.fatherName || "",
      cnic: bill.cnic,
      phone: details[0]?.phone || "",
      address: details[0]?.address || "",
    },
    visit: {
      id: bill.visitId,
      visitNumber: printableVisitNumber(bill.visitId, bill.visitDate),
      visitSequence: bill.visitNumber,
      visitDate: bill.visitDate,
      doctorName: bill.doctorName || "",
      createdBy: details[0]?.createdBy || "",
      status: bill.visitStatus,
    },
    bill: {
      id: bill.id,
      billNumber: bill.billNumber,
      issueDate: bill.createdAt,
      feeType: bill.feeType,
      paymentStatus: bill.paymentStatus,
      grossTotal: bill.grossTotal,
      amountPaid: bill.amountPaid,
      balanceDue: bill.balanceDue,
    },
    items,
    payments: paymentsWithBalance.reverse(),
    totals: {
      subtotal: bill.grossTotal,
      grossTotal: bill.grossTotal,
      amountPaid: bill.amountPaid,
      balanceDue: bill.balanceDue,
      paymentStatus: bill.paymentStatus,
    },
  };
}

export const billingService = {
  async list(query) {
    const clauses = [],
      params = [];
    if (query.search) {
      const term = `%${query.search}%`;
      clauses.push(
        "(b.bill_number LIKE ? OR p.patient_number LIKE ? OR p.cnic LIKE ? OR CONCAT(p.first_name,' ',p.last_name) LIKE ? OR CAST(v.visit_number AS CHAR) LIKE ?)",
      );
      params.push(term, term, term, term, term);
    }
    if (query.status !== "ALL") {
      clauses.push("b.payment_status=?");
      params.push(query.status);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const offset = (query.page - 1) * query.limit;
    const [rows] = await database.execute(
      `${billSelect}${where} ORDER BY b.created_at DESC LIMIT ${query.limit} OFFSET ${offset}`,
      params,
    );
    const [counts] = await database.execute(
      `SELECT COUNT(*) total FROM visit_bills b JOIN patients p ON p.id=b.patient_id JOIN patient_visits v ON v.id=b.visit_id${where}`,
      params,
    );
    const total = Number(counts[0].total);
    return {
      items: rows.map(present),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total ? Math.ceil(total / query.limit) : 0,
    };
  },
  async get(id) {
    const bill = await getBill(id);
    const [services] = await database.execute(
      "SELECT ps.id,ps.quantity,ps.unit_price AS unitPrice,ps.total_amount AS totalAmount,ps.status,s.name AS serviceName,s.code AS serviceCode,d.name AS departmentName,d.code AS departmentCode FROM patient_services ps JOIN services s ON s.id=ps.service_id JOIN departments d ON d.id=s.department_id WHERE ps.visit_id=? AND ps.status<>'CANCELLED' ORDER BY d.name,s.name,ps.created_at",
      [bill.visitId],
    );
    const [payments] = await database.execute(
      `SELECT * FROM (SELECT CONCAT('REG-',rp.id) rowKey,rp.receipt_number AS paymentNumber,rp.amount,rp.payment_method AS paymentMethod,NULL referenceNumber,CONCAT('Visit fee (',rp.fee_type,')') notes,rp.paid_at AS paidAt,CONCAT(u.first_name,' ',u.last_name) receivedBy,'VISIT_FEE' source FROM registration_payments rp JOIN users u ON u.id=rp.received_by WHERE rp.visit_id=? AND rp.payment_status='PAID' UNION ALL SELECT CONCAT('PAY-',bp.id),bp.payment_number,bp.amount,bp.payment_method,bp.reference_number,bp.notes,bp.paid_at,CONCAT(u.first_name,' ',u.last_name),'BILL_PAYMENT' FROM bill_payments bp JOIN users u ON u.id=bp.received_by WHERE bp.bill_id=?) payments ORDER BY paidAt DESC`,
      [bill.visitId, bill.id],
    );
    const grouped = services.reduce((groups, row) => {
      const key = row.departmentName;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        ...row,
        unitPrice: Number(row.unitPrice),
        totalAmount: Number(row.totalAmount),
      });
      return groups;
    }, {});
    return {
      ...bill,
      serviceGroups: grouped,
      payments: payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  },
  async getByVisit(visitId) {
    const [rows] = await database.execute(
      "SELECT id FROM visit_bills WHERE visit_id=?",
      [visitId],
    );
    if (!rows.length) throw new AppError(404, "Bill not found.");
    return this.get(rows[0].id);
  },
  async getPrintable(id) {
    return getPrintContext(id);
  },
  async getPaymentReceipt(id, paymentNumber) {
    const printable = await getPrintContext(id);
    const payment = printable.payments.find(
      (item) => item.paymentNumber === paymentNumber,
    );
    if (!payment) throw new AppError(404, "Payment receipt not found.");
    return { ...printable, payment };
  },
  async recordPrint(id, input, actor) {
    const printable = await getPrintContext(id);
    if (input.documentType === "PAYMENT_RECEIPT") {
      const payment = printable.payments.find(
        (item) => item.paymentNumber === input.paymentNumber,
      );
      if (!payment) throw new AppError(404, "Payment receipt not found.");
      const details = `${actor.firstName} ${actor.lastName} printed payment receipt ${payment.paymentNumber} for ${printable.patient.name} (${printable.patient.patientNumber}).`;
      await database.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,details) VALUES (?,?,'PAYMENT_RECEIPT_PRINTED','BILL_PAYMENT',?,?)",
        [randomUUID(), actor.id, payment.paymentNumber, details],
      );
      return { details };
    }
    const details = `${actor.firstName} ${actor.lastName} printed invoice ${printable.bill.billNumber} for ${printable.patient.name} (${printable.patient.patientNumber}), Visit #${printable.visit.visitSequence}.`;
    await database.execute(
      "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,details) VALUES (?,?,'BILL_PRINTED','VISIT_BILL',?,?)",
      [randomUUID(), actor.id, String(printable.bill.id), details],
    );
    return { details };
  },
  async addPayment(billId, input, actor) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const [locks] = await connection.execute(
        "SELECT id,visit_id AS visitId FROM visit_bills WHERE id=? FOR UPDATE",
        [billId],
      );
      if (!locks.length) throw new AppError(404, "Bill not found.");
      let bill = await recalculateVisitBill(
        connection,
        locks[0].visitId,
        actor.id,
      );
      const amountCents = Math.round(input.amount * 100),
        balanceCents = Math.round(bill.balanceDue * 100);
      if (balanceCents <= 0)
        throw new AppError(409, "This bill has been paid in full.");
      if (amountCents > balanceCents)
        throw new AppError(
          400,
          `Payment cannot exceed the outstanding balance of PKR ${money(bill.balanceDue)}.`,
          [],
          "amount",
        );
      const current = await getBill(billId, connection);
      const temporary = `PENDING-${randomUUID()}`;
      const [result] = await connection.execute(
        "INSERT INTO bill_payments (payment_number,bill_id,patient_id,visit_id,amount,payment_method,reference_number,notes,received_by) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          temporary,
          billId,
          current.patientId,
          current.visitId,
          input.amount,
          input.paymentMethod,
          input.referenceNumber || null,
          input.notes || null,
          actor.id,
        ],
      );
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(result.insertId).padStart(6, "0")}`;
      await connection.execute(
        "UPDATE bill_payments SET payment_number=? WHERE id=?",
        [paymentNumber, result.insertId],
      );
      bill = await recalculateVisitBill(connection, current.visitId, actor.id);
      const details = `${actor.firstName} ${actor.lastName} recorded a ${input.paymentMethod.toLowerCase().replaceAll("_", " ")} payment of PKR ${money(input.amount)} for ${current.patientName} (${current.patientNumber}), Visit #${current.visitNumber}, Bill ${current.billNumber}. The bill is now ${bill.paymentStatus.toLowerCase().replaceAll("_", " ")}.`;
      await connection.execute(
        "INSERT INTO audit_logs (id,user_id,action,entity,entity_id,details,new_data) VALUES (?,?,'PAYMENT_RECORDED','BILL_PAYMENT',?,?,?)",
        [
          randomUUID(),
          actor.id,
          String(result.insertId),
          details,
          JSON.stringify({
            paymentNumber,
            billId: Number(billId),
            visitId: current.visitId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentStatus: bill.paymentStatus,
          }),
        ],
      );
      await connection.commit();
      return { paymentNumber, ...bill, details };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
