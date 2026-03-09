import { NavLink, Outlet, Link } from 'react-router-dom';

const PUBLIC_NAV_ITEMS = [
  { to: "/", label: "公開トップ" },
  { to: "/apply", label: "入会申込" },
  { to: "/directory", label: "会員名簿" },
  { to: "/manual", label: "運用マニュアル" },
];

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <Link className="public-brand" to="/">
            <span className="workspace-brand-mark">M</span>
            <div>
              <strong>MITO21</strong>
              <span>水戸21の会</span>
            </div>
          </Link>
          <nav className="public-nav">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `public-nav-link${isActive ? " is-active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
}
