import axios from "axios";

let apiErrorHandler = null;

export const setApiErrorHandler = (handler) => {
  apiErrorHandler = handler;
  return () => {
    if (apiErrorHandler === handler) apiErrorHandler = null;
  };
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hms_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    const hadSession = Boolean(localStorage.getItem("hms_token"));
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (status === 401 && hadSession && !isLoginRequest) {
      localStorage.removeItem("hms_token");
      apiErrorHandler?.({ type: "session-expired" });
    } else if (status === 403) {
      apiErrorHandler?.({ type: "forbidden", message });
    } else if (status === 404) {
      apiErrorHandler?.({
        type: "info",
        title: "Not Found",
        message: message || "The requested record could not be found.",
      });
    } else if (status === 409) {
      apiErrorHandler?.({
        type: "warning",
        title: "Conflict",
        message: message || "This action conflicts with an existing record.",
      });
    } else if (status >= 500 || !error.response) {
      apiErrorHandler?.({
        type: "error",
        title: "Something Went Wrong",
        message: "We couldn't complete that request. Please try again.",
      });
    }
    return Promise.reject(error);
  },
);
