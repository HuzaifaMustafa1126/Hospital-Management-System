import { api } from "./api";
export const doctorService = {
  list: () => api.get("/doctors"),
  get: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post("/doctors", data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  status: (id, isActive) => api.patch(`/doctors/${id}/status`, { isActive }),
};
