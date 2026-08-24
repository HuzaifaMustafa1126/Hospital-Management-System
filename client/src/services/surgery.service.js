import { api } from "./api";

export const surgeryService = {
  overview: () => api.get("/surgery"),
  searchPatients: (params) => api.get("/surgery/patients", { params }),
  getPatient: (id) => api.get(`/surgery/patients/${id}`),
  availableServices: () => api.get("/surgery/services"),
  addService: (patientId, data) => api.post(`/surgery/patients/${patientId}/services`, data),
};
