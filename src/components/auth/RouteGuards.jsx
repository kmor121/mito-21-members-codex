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
