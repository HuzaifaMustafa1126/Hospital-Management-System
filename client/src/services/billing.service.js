import { api } from "./api";
export const billingService={list:(params)=>api.get("/billing",{params}),get:(id)=>api.get(`/billing/${id}`),byVisit:(visitId)=>api.get(`/billing/visit/${visitId}`),addPayment:(id,data)=>api.post(`/billing/${id}/payments`,data)};
