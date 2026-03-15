import { Outlet, Link } from 'react-router-dom';

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
        </div>
      </header>
      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
}
