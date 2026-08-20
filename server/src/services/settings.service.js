import { database } from '../db/database.js';
import { AppError } from '../utils/app-error.js';

const getFee = async (connection = database) => {
  const [rows] = await connection.execute("SELECT setting_value AS amount FROM settings WHERE setting_key = 'REGISTRATION_FEE'");
  const amount = Number(rows[0]?.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(500, 'Registration fee is not configured correctly');
  return { amount, currency: 'PKR' };
};

export const settingsService = {
  getRegistrationFee: getFee,
  async updateRegistrationFee(amount) {
    await database.execute("UPDATE settings SET setting_value = ? WHERE setting_key = 'REGISTRATION_FEE'", [String(amount)]);
    return getFee();
  },
};
