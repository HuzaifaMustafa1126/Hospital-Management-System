import { api } from "./api";

export const bloodBankService = {
  overview: () => api.get("/blood-bank"),
  searchPatients: (params) => api.get("/blood-bank/patients", { params }),
  getPatient: (id) => api.get(`/blood-bank/patients/${id}`),
  availableServices: () => api.get("/blood-bank/services"),
  visitServices: (visitId) => api.get(`/blood-bank/visits/${visitId}/services`),
  addService: (visitId, data) => api.post(`/blood-bank/visits/${visitId}/services`, data),
};
