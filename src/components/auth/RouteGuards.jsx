import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../common/LoadingSpinner";

function AuthLoading() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8fafc",
    }}>
      <LoadingSpinner />
    </div>
  );
}

/** Requires authentication. Redirects to /login if not logged in. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ returnTo: location.pathname }} replace />;
  }
  return children;
}

/** Requires admin access. Redirects to /directory if not admin/admin_member. */
export function AdminRoute({ children }) {
  const { isAuthenticated, canAccessAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ returnTo: location.pathname }} replace />;
  }
  if (!canAccessAdmin) {
    return <Navigate to="/directory" replace />;
  }
  return children;
}

/** Requires manager+ access. Redirects to /directory if insufficient role. */
export function ManagerRoute({ children }) {
  const { isAuthenticated, canAccessManagerPages, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ returnTo: location.pathname }} replace />;
  }
  if (!canAccessManagerPages) {
    return <Navigate to="/directory" replace />;
  }
  return children;
}

/** Requires authentication AND member linkage. Auto-logout if member deleted. */
export function LinkedMemberRoute({ children }) {
  const { isAuthenticated, loading, isMemberLinked, canAccessAdmin, logout, revalidateMember } = useAuth();
  const location = useLocation();

  // Revalidate member existence on every route change
  useEffect(() => {
    if (isAuthenticated && revalidateMember) {
      revalidateMember();
    }
  }, [location.pathname, isAuthenticated, revalidateMember]);

  // 会員レコードが存在しない非管理者ユーザーを3秒後に自動ログアウト
  const shouldAutoLogout = isAuthenticated && !loading && !canAccessAdmin && !isMemberLinked;
  useEffect(() => {
    if (!shouldAutoLogout) return;
    const timer = setTimeout(() => { logout(); }, 3000);
    return () => clearTimeout(timer);
  }, [shouldAutoLogout, logout]);

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ returnTo: location.pathname }} replace />;
  }
  // Admin bypass member link check
  if (canAccessAdmin) return children;
  if (!isMemberLinked) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8fafc",
      }}>
        <div style={{
          background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          padding: "48px 36px", maxWidth: 440, width: "100%", textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "#fef2f2",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <span style={{ fontSize: 28 }}>&#9888;</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 12 }}>
            アクセス権限がありません
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
            会員として登録されていないため、ログアウトします。
          </p>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 28 }}>
            管理者にお問い合わせください。
          </p>
          <button
            onClick={logout}
            style={{
              padding: "10px 32px", borderRadius: 8, border: "1px solid var(--color-border)",
              background: "#fff", color: "#334155", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            今すぐログアウト
          </button>
        </div>
      </div>
    );
  }
  return children;
}

/** For login page: redirects authenticated users away. */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, canAccessAdmin, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (isAuthenticated) {
    return <Navigate to={canAccessAdmin ? "/admin" : "/directory"} replace />;
  }
  return children;
}

/** Root redirect: routes user based on role. */
export function RootRedirect() {
  const { isAuthenticated, canAccessAdmin, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  if (canAccessAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/directory" replace />;
}
