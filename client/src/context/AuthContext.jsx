import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authService } from "../services/auth.service";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem("hms_token")) return setLoading(false);
    authService.me().then((response) => setUser(response.data.data)).catch(() => localStorage.removeItem("hms_token")).finally(() => setLoading(false));
  }, []);
  const login = async (email, password) => {
    const response = await authService.login(email, password);
    localStorage.setItem("hms_token", response.data.data.token);
    setUser(response.data.data.user);
  };
  const expireSession = useCallback(() => {
    localStorage.removeItem("hms_token");
    setUser(null);
  }, []);
  const logout = async () => {
    try { await authService.logout(); } finally { expireSession(); }
  };
  return <AuthContext.Provider value={{ user, loading, login, logout, expireSession }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
