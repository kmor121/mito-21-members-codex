import { NavLink } from 'react-router-dom';
import { Users, GitBranch, UserCircle, FileText, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: "/directory", label: "名簿", icon: Users },
  { to: "/organization", label: "組織図", icon: GitBranch },
  { to: "/mypage", label: "マイページ", icon: UserCircle },
  { to: "/info", label: "資料", icon: FileText },
  { to: "/manual", label: "マニュアル", icon: Settings },
];

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="メインナビゲーション">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `mobile-bottom-nav-item${isActive ? " is-active" : ""}`
          }
        >
          <item.icon size={20} strokeWidth={2} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
