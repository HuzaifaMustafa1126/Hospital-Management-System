import { api } from "./api";
export const departmentService = {
  list: (params) => api.get("/departments", { params }),
  get: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post("/departments", data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
  status: (id, isActive) =>
    api.patch(`/departments/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/departments/${id}`),
  deletionImpact: (id) => api.get(`/departments/${id}/deletion-impact`),
  removeAssignments: (id) => api.delete(`/departments/${id}/assignments`),
  removeServiceMappings: (id) => api.delete(`/departments/${id}/service-mappings`),
};
