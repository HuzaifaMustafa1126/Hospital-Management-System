import { api } from "./api";
export const laboratoryService = { searchPatients: (params) => api.get("/laboratory/patients", { params }), getPatient: (id) => api.get(`/laboratory/patients/${id}`), availableServices: () => api.get("/laboratory/services"), addService: (patientId, data) => api.post(`/laboratory/patients/${patientId}/services`, data) };
