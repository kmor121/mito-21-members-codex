import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { auth, base44 } from "../api/base44Client";

const TOKEN_KEY = "base44_token";
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberInfo, setMemberInfo] = useState(null);
  const [memberCheckDone, setMemberCheckDone] = useState(false);
  const lastRevalidateRef = useRef(0);

  // Fetch member info: try direct entity API, fallback to backend function
  const fetchMemberInfo = useCallback(async (userId) => {
    // Try 1: direct entity query (fastest, no backend function needed)
    try {
      const members = await base44.entities.Member.filter({ user_id: userId });
      if (members && members.length > 0) {
        setMemberInfo(members[0]);
        lastRevalidateRef.current = Date.now();
        return members[0];
      }
    } catch { /* RLS might block, try function fallback */ }

    // Try 2: backend function (uses serviceRole, bypasses RLS)
    try {
      const res = await base44.functions.invoke("get-my-member-info", {});
      if (res?.ok && res?.member) {
        setMemberInfo(res.member);
        lastRevalidateRef.current = Date.now();
        return res.member;
      }
    } catch { /* ignore */ }

    setMemberInfo(null);
    lastRevalidateRef.current = Date.now();
    return null;
  }, []);

  // Revalidate member existence (lightweight check)
  // If member record is confirmed deleted, force logout (non-admin users only).
  const revalidateMember = useCallback(async () => {
    if (!user) return;
    const isAdmin = user.role === "admin";
    const now = Date.now();
    // Throttle: skip if last check was within interval
    if (now - lastRevalidateRef.current < REVALIDATE_INTERVAL_MS) return;

    const userId = user.id || user._id;
    if (!userId) return;

    try {
      const members = await base44.entities.Member.filter({ user_id: userId });
      if (!members || members.length === 0) {
        // Member record no longer exists
        setMemberInfo(null);
        // Platform admin はメンバーなしでもアクセス可。それ以外は強制ログアウト。
        if (!isAdmin) {
          lastRevalidateRef.current = Date.now();
          // 少し遅延を入れて state 更新を反映させてからログアウト
          setTimeout(() => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem("base44_access_token");
            localStorage.removeItem("token");
            window.location.href = "/signin";
          }, 100);
          return;
        }
      } else {
        setMemberInfo(members[0]);
      }
    } catch {
      // Network error — don't clear state, just skip
    }
    lastRevalidateRef.current = Date.now();
  }, [user]);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const me = await auth.me();
        if (me) {
          setUser(me);
          // Best-effort link (syncs User.data.app_role from Member.app_role)
          try { await base44.functions.invoke("link-user-to-member", {}); } catch { /* ignore */ }
          await fetchMemberInfo(me.id || me._id);
        } else {
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setMemberCheckDone(true);
        setLoading(false);
      }
    }
    checkSession();
  }, [fetchMemberInfo]);

  // Revalidate member on window focus (detect deleted member while tab was inactive)
  useEffect(() => {
    function handleFocus() {
      revalidateMember();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [revalidateMember]);

  const login = useCallback(async (email, password) => {
    // Reset memberCheckDone so computed loading stays true until fetchMemberInfo completes.
    // This prevents LinkedMemberRoute from flashing the "no access" screen.
    setMemberCheckDone(false);
    const result = await auth.loginViaEmailPassword(email, password);
    // Save token via SDK + localStorage
    if (result?.access_token) {
      auth.setToken(result.access_token, true);
      localStorage.setItem(TOKEN_KEY, result.access_token);
    }
    const me = await auth.me();
    setUser(me || null);
    // Link user to member (syncs User.data.app_role)
    try { await base44.functions.invoke("link-user-to-member", {}); } catch { /* ignore */ }
    if (me) {
      await fetchMemberInfo(me.id || me._id);
    }
    setMemberCheckDone(true);
    return result;
  }, [fetchMemberInfo]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
    setUser(null);
    setMemberInfo(null);
    setMemberCheckDone(false);
    window.location.href = "/signin";
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = !!user;
    const isAdmin = user?.role === "admin";
    // memberInfo が存在する場合のみ app_role を参照。
    // memberInfo が null（会員削除済み）なら User に残った古い app_role を使わない。
    const appRole = memberInfo?.app_role || (isAdmin ? "admin" : "member");
    const isAdminMember = appRole === "admin_member";
    const isManager = appRole === "manager";
    const canAccessAdmin = isAdmin || isAdminMember;
    const canAccessManagerPages = isAdmin || isAdminMember || isManager;
    const isMemberLinked = !!memberInfo;

    return {
      user,
      loading: loading || (isAuthenticated && !memberCheckDone),
      isAuthenticated,
      isAdmin,
      isAdminMember,
      isManager,
      canAccessAdmin,
      canAccessManagerPages,
      isMemberLinked,
      memberInfo,
      appRole: isAdmin ? "admin" : appRole,
      login,
      logout,
      revalidateMember,
    };
  }, [user, loading, memberCheckDone, memberInfo, login, logout, revalidateMember]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
