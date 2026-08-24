import { database } from "../db/database.js";
import { AppError } from "../utils/app-error.js";

const hospitalKeys = {
  name: "HOSPITAL_NAME",
  shortName: "HOSPITAL_SHORT_NAME",
  logoUrl: "HOSPITAL_LOGO",
  address: "HOSPITAL_ADDRESS",
  phone: "HOSPITAL_PHONE",
  alternatePhone: "HOSPITAL_ALTERNATE_PHONE",
  email: "HOSPITAL_EMAIL",
  website: "HOSPITAL_WEBSITE",
  taxNumber: "HOSPITAL_TAX_NUMBER",
  registrationNumber: "HOSPITAL_REGISTRATION_NUMBER",
  footerMessage: "HOSPITAL_FOOTER",
  currency: "HOSPITAL_CURRENCY",
  invoicePrefix: "HOSPITAL_INVOICE_PREFIX",
  receiptPrefix: "HOSPITAL_RECEIPT_PREFIX",
};

const getFee = async (connection = database) => {
  const [rows] = await connection.execute(
    "SELECT setting_value AS amount FROM settings WHERE setting_key = 'REGISTRATION_FEE'",
  );
  const amount = Number(rows[0]?.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new AppError(500, "Registration fee is not configured correctly");
  return { amount, currency: "PKR" };
};

export const settingsService = {
  getRegistrationFee: getFee,
  async updateRegistrationFee(amount) {
    await database.execute(
      "UPDATE settings SET setting_value = ? WHERE setting_key = 'REGISTRATION_FEE'",
      [String(amount)],
    );
    return getFee();
  },
  async getHospital(connection = database) {
    const [rows] = await connection.execute(
      `SELECT setting_key AS settingKey, setting_value AS settingValue FROM settings WHERE setting_key IN (${Object.values(
        hospitalKeys,
      )
        .map(() => "?")
        .join(",")})`,
      Object.values(hospitalKeys),
    );
    const values = Object.fromEntries(
      rows.map((row) => [row.settingKey, row.settingValue]),
    );
    return Object.fromEntries(
      Object.entries(hospitalKeys).map(([field, key]) => [
        field,
        values[key] || "",
      ]),
    );
  },
  async updateHospital(input) {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      for (const [field, key] of Object.entries(hospitalKeys))
        await connection.execute(
          "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
          [key, input[field] ?? ""],
        );
      await connection.commit();
      return this.getHospital();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
