import { NavLink, Outlet, Link } from 'react-router-dom';
import { useState } from 'react';

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

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        </header>
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
