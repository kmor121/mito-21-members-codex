import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "../api/base44Client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    let cancelled = false;
    auth.me().then((u) => {
      if (!cancelled) setUser(u || null);
    }).catch(() => {
      if (!cancelled) setUser(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await auth.loginViaEmailPassword(email, password);
    // After login, fetch full user profile
    const me = await auth.me();
    setUser(me || null);
    return result;
  }, []);

  const logout = useCallback(() => {
    try { auth.logout(); } catch { /* ignore */ }
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = !!user;
    const isAdmin = user?.role === "admin";
    // Custom User fields may be at user.app_role or user.data.app_role
    const appRole = user?.app_role || user?.data?.app_role || "member";
    const isAdminMember = appRole === "admin_member";
    const isManager = appRole === "manager";
    const canAccessAdmin = isAdmin || isAdminMember;
    const canAccessManagerPages = isAdmin || isAdminMember || isManager;

    return {
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isAdminMember,
      isManager,
      canAccessAdmin,
      canAccessManagerPages,
      appRole: isAdmin ? "admin" : appRole,
      login,
      logout,
    };
  }, [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
