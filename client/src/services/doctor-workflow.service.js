import { api } from './api';
export const doctorWorkflowService={
  queue:(search)=>api.get('/doctor/queue',{params:{search}}),
  details:(id)=>api.get(`/doctor/queue/visits/${id}/details`),
  claim:(id)=>api.post(`/doctor/visits/${id}/claim`),
  availableServices:(id)=>api.get(`/doctor/visits/${id}/services`),
  orders:(id)=>api.get(`/doctor/visits/${id}/short-stay-orders`),
  addOrder:(id,data)=>api.post(`/doctor/visits/${id}/short-stay-orders`,data),
};
