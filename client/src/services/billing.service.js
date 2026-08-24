import { api } from "./api";
export const billingService = {
  list: (params) => api.get("/billing", { params }),
  get: (id) => api.get(`/billing/${id}`),
  byVisit: (visitId) => api.get(`/billing/visit/${visitId}`),
  printable: (id) => api.get(`/billing/${id}/print`),
  paymentReceipt: (id, paymentNumber) =>
    api.get(
      `/billing/${id}/payments/${encodeURIComponent(paymentNumber)}/print`,
    ),
  recordPrint: (id, data) => api.post(`/billing/${id}/print-events`, data),
  addPayment: (id, data) => api.post(`/billing/${id}/payments`, data),
};
