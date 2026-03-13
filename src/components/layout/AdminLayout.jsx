import { NavLink, Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "ダッシュボード" },
  { to: "/admin/members", label: "会員一覧" },
  { to: "/admin/applications", label: "入会申込管理" },
  { to: "/admin/dues-management", label: "会費管理" },
  { to: "/admin/organization-chart", label: "組織図管理" },
  { to: "/admin/newsletters", label: "配信管理" },
  { to: "/admin/fiscal-years", label: "年度管理" },
  { to: "/admin/documents", label: "資料管理" },
  { to: "/admin/settings", label: "設定" },
];

const MEMBER_NAV_ITEMS = [
  { to: "/directory", label: "会員名簿" },
  { to: "/organization", label: "組織図" },
  { to: "/info", label: "基本情報" },
  { to: "/manual", label: "運用マニュアル" },
  { to: "/mypage", label: "マイページ" },
];

const ROLE_BADGE = {
  admin:        { label: "Admin",   bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  admin_member: { label: "管理者",  bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  manager:      { label: "幹事",    bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  member:       { label: "会員",    bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, appRole, logout } = useAuth();

  const badge = ROLE_BADGE[appRole] || ROLE_BADGE.member;
  const displayName = user?.full_name || user?.email || "";

  return (
    <div className="workspace-shell">
      <div
        className={`sidebar-overlay${sidebarOpen ? " is-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`workspace-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <Link className="workspace-brand" to="/">
          <span className="workspace-brand-mark">M</span>
          <div>
            <strong>MITO21</strong>
            <span>管理画面</span>
          </div>
        </Link>
        <div className="workspace-group-label">管理メニュー</div>
        <nav className="workspace-nav">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="workspace-group-label">会員メニュー</div>
        <nav className="workspace-nav">
          {MEMBER_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <button
            className="mobile-nav-toggle"
            type="button"
            aria-label="メニュー"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
          <p className="workspace-breadcrumb"></p>

          {/* User info */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            }}>{badge.label}</span>
            <span style={{ color: "#374151", fontWeight: 500 }}>{displayName}</span>
            <button
              type="button"
              onClick={logout}
              style={{
                background: "none", border: "1px solid #d1d5db", borderRadius: 6,
                padding: "4px 10px", fontSize: 12, color: "#64748b", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#64748b"; }}
            >
              ログアウト
            </button>
          </div>
        </header>
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
