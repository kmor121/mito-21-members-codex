import { NavLink, Outlet, Link } from 'react-router-dom';
import { Suspense } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { base44 } from '../../api/base44Client';
import MobileBottomNav from '../member/MobileBottomNav';

function ApplyUrlCopyButton() {
  const [copied, setCopied] = useState(false);
  const applyUrl = `${window.location.origin}/apply`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(applyUrl);
      setCopied(true);
      if (window.__showToast) window.__showToast("URLをコピーしました", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = applyUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      if (window.__showToast) window.__showToast("URLをコピーしました", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [applyUrl]);

  return (
    <div style={{ padding: "8px 16px" }}>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>入会申込フォームURL</p>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "var(--color-bg-sub)", border: "1px solid var(--color-border)", borderRadius: 8,
        padding: "6px 8px 6px 12px",
      }}>
        <span style={{
          flex: 1, fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {applyUrl}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 6,
            border: copied ? "1px solid var(--color-success)" : "1px solid var(--color-border)",
            background: copied ? "var(--color-success-light)" : "var(--color-bg)",
            color: copied ? "var(--color-success)" : "var(--color-text-secondary)",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              コピー済
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              コピー
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const MEMBER_NAV_ITEMS = [
  { to: "/directory", label: "会員名簿" },
  { to: "/info", label: "基本情報" },
  { to: "/organization", label: "組織図" },
];

const ROLE_BADGE = {
  admin:        { label: "Admin",   bg: "var(--color-danger-light)", color: "var(--color-danger)", border: "#fecaca" },
  admin_member: { label: "管理者",  bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  manager:      { label: "幹事",    bg: "var(--color-accent-light)", color: "var(--color-accent)", border: "#bfdbfe" },
  member:       { label: "会員",    bg: "var(--color-bg-sub)", color: "var(--color-text-secondary)", border: "var(--color-border)" },
};

export default function MemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBoardMember, setIsBoardMember] = useState(false);
  const { user, appRole, canAccessAdmin, memberInfo, logout } = useAuth();

  // Check if member is assigned to 幹事会 or its child orgs
  useEffect(() => {
    if (!memberInfo) return;
    const memberId = memberInfo.id || memberInfo._id;
    (async () => {
      try {
        const [orgs, assigns, fyList] = await Promise.all([
          base44.entities.Organization.list(),
          base44.entities.OrgAssignment.filter({ member_id: memberId }),
          base44.entities.FiscalYear.list(),
        ]);
        const currentFY = fyList.find((fy) => fy.is_current);
        if (!currentFY) return;
        const fyId = currentFY.id;
        // Find 幹事会 and all child orgs
        const boardOrg = orgs.find((o) => o.org_type === "幹事会" && o.fiscal_year_id === fyId);
        if (!boardOrg) return;
        const boardOrgIds = new Set([boardOrg.id]);
        function addChildren(pid) {
          orgs.forEach((o) => { if (o.parent_id === pid && o.fiscal_year_id === fyId) { boardOrgIds.add(o.id); addChildren(o.id); } });
        }
        addChildren(boardOrg.id);
        const isBoard = assigns.some((a) => boardOrgIds.has(a.organization_id) && a.fiscal_year_id === fyId);
        setIsBoardMember(isBoard);
      } catch { /* ignore */ }
    })();
  }, [memberInfo]);

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
            <span>会員向け</span>
          </div>
        </Link>
        <div className="workspace-sidebar-nav-scroll">
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
            <NavLink
              to="/events"
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>イベント</span>
            </NavLink>
            {isBoardMember && (
              <NavLink
                to="/meetings"
                className={({ isActive }) =>
                  `workspace-nav-link${isActive ? " is-active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span>幹事会</span>
              </NavLink>
            )}
            <NavLink
              to="/manual"
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>運用マニュアル</span>
            </NavLink>
            <NavLink
              to="/mypage"
              className={({ isActive }) =>
                `workspace-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>マイページ</span>
            </NavLink>
          </nav>
          <div className="workspace-group-label">入会のご案内</div>
          <ApplyUrlCopyButton />
          {canAccessAdmin && (
            <>
              <div className="workspace-group-label">管理</div>
              <nav className="workspace-nav">
                <NavLink
                  to="/admin"
                  className="workspace-nav-link"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span>管理画面へ</span>
                </NavLink>
              </nav>
            </>
          )}
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
            <span className="mobile-hide-name" style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{displayName}</span>
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
      <MobileBottomNav />
    </div>
  );
}
