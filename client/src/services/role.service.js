import { api } from './api';
export const roleService={list:()=>api.get('/roles'),create:(data)=>api.post('/roles',data),update:(id,data)=>api.patch(`/roles/${id}`,data),remove:(id)=>api.delete(`/roles/${id}`),permissions:(id)=>api.get(`/roles/${id}/permissions`),setPermissions:(id,permissionIds)=>api.put(`/roles/${id}/permissions`,{permissionIds}),catalog:()=>api.get('/permissions')};
