import { api } from "./api";
export const patientService = {
  list: (params) => api.get("/patients", { params }),
  search: (params) => api.get("/patients/search", { params }),
  checkCnic: (cnic) => api.get("/patients/check-cnic", { params: { cnic } }),
  checkPhone: (phone) =>
    api.get("/patients/check-phone", { params: { phone } }),
  get: (id) => api.get(`/patients/${id}`),
  visits: (id) => api.get(`/patients/${id}/visits`),
  createVisit: (id) => api.post(`/patients/${id}/visits`),
  getVisit: (id) => api.get(`/visits/${id}`),
  create: (data) => api.post("/patients", data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  remove: (id) => api.delete(`/patients/${id}`),
};
