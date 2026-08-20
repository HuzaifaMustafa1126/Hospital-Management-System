import { api } from './api';
export const settingsService = { registrationFee: () => api.get('/settings/registration-fee'), updateRegistrationFee: (amount) => api.put('/settings/registration-fee', { amount }) };
