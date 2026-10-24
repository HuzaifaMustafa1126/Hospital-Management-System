import { api } from "./api";
export const userService = {
  list: (params) => api.get("/users",{params}),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  status: (id, status) => api.patch(`/users/${id}/status`, { status }),
  roles:(id,roleIds)=>api.put(`/users/${id}/roles`,{roleIds}),
  departments:(id,departmentIds)=>api.put(`/users/${id}/departments`,{departmentIds}),
  resetPassword: (id, password) =>
    api.post(`/users/${id}/reset-password`, { password }),
};
