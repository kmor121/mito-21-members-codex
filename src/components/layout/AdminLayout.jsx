import { NavLink, Outlet, Link } from 'react-router-dom';
import { Suspense } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_NAV_ITEMS = [
  { to: "/admin/dashboard", label: "ダッシュボード" },
  { to: "/admin/members", label: "会員一覧" },
  { to: "/admin/applications", label: "入会申込管理" },
  { to: "/admin/dues-management", label: "会費管理" },
  { to: "/admin/organization-chart", label: "組織図管理" },
  { to: "/admin/meetings", label: "幹事会管理" },
  { to: "/admin/events", label: "イベント管理" },
  { to: "/admin/newsletters", label: "配信管理" },
  { to: "/admin/fiscal-years", label: "年度管理" },
  { to: "/admin/documents", label: "資料管理" },
  { to: "/admin/settings", label: "設定" },
];

const MEMBER_NAV_ITEMS = [
  { to: "/directory", label: "会員名簿" },
  { to: "/info", label: "基本情報" },
  { to: "/organization", label: "組織図" },
  { to: "/events", label: "イベント" },
  { to: "/meetings", label: "幹事会" },
  { to: "/manual", label: "運用マニュアル" },
  { to: "/mypage", label: "マイページ" },
];

const ROLE_BADGE = {
  admin:        { label: "Admin",   bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  admin_member: { label: "管理者",  bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  manager:      { label: "幹事",    bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  member:       { label: "会員",    bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, appRole, logout } = useAuth();

  // Body scroll lock when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const badge = ROLE_BADGE[appRole] || ROLE_BADGE.member;
  const displayName = user?.full_name || user?.email || "";

  return (
    <div className="workspace-shell">
      <div
        className={`sidebar-overlay${sidebarOpen ? " is-visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`workspace-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <Link className="workspace-brand" to="/" onClick={() => setSidebarOpen(false)}>
          <span className="workspace-brand-mark">M</span>
          <div>
            <strong>MITO21</strong>
            <span>管理画面</span>
          </div>
        </Link>
        <div className="workspace-sidebar-nav-scroll">
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
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <button
            className={`mobile-nav-toggle${sidebarOpen ? " is-open" : ""}`}
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
              padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            }}>{badge.label}</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{displayName}</span>
            <button
              type="button"
              onClick={logout}
              style={{
                background: "none", border: "1px solid var(--color-border)", borderRadius: 6,
                padding: "4px 10px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-danger)"; e.currentTarget.style.color = "var(--color-danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            >
              ログアウト
            </button>
          </div>
        </header>
        <main className="workspace-content">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
