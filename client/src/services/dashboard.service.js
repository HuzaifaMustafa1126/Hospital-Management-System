import { api } from "./api";
export const dashboardService = {
  summary: (days = 30) => api.get("/dashboard/summary", { params: { days } }),
};
