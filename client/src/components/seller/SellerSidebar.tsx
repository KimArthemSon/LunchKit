import { Link, NavLink, useNavigate } from "react-router-dom";
import { I } from "../Shared";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { SELLER_NAV } from "./sellerNav";
import { LogoMark } from "../Logo";

interface Props {
  onNavigate?: () => void; // Mobile drawer: close after picking a page
  onClose?: () => void; // Mobile drawer: show a close button
}

export default function SellerSidebar({ onNavigate, onClose }: Props) {
  const { user, logout } = useAuth();
  const alert = useAlert();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await alert.confirm({
      title: "Log out?",
      message: "You'll need to sign in again to manage your store.",
      confirmText: "Log out",
      danger: true,
    });
    if (!ok) return;
    onNavigate?.();
    logout();
    navigate("/login", { replace: true }); // Fresh login page — no "return to" from this session
  };

  const initials = (user?.name ?? "S").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="w-64 h-full bg-stone-950 border-r border-stone-800 flex flex-col">
      {/* Brand */}
      <div className="h-20 px-5 flex items-center justify-between border-b border-stone-800 shrink-0">
        <Link to="/seller/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="text-lg font-bold text-white tracking-tight">LaunchKit</span>
          <span className="px-2 py-0.5 rounded-full border border-stone-700 text-stone-400 text-[10px] font-medium uppercase tracking-wider">
            Seller
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <I name="X" size={18} />
          </button>
        )}
      </div>

      {/* Primary action */}
      <div className="px-4 pt-5 shrink-0">
        <Link
          to="/seller/products?new=1"
          onClick={onNavigate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-white hover:bg-stone-200 text-stone-900 text-sm font-medium transition-colors"
        >
          <I name="Plus" size={16} /> New product
        </Link>
      </div>

      {/* Navigation (scrolls on its own if the window is short) */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Seller">
        {SELLER_NAV.map((section) => (
          <div key={section.group}>
            <p className="px-3 mb-2 text-xs text-stone-500">{section.group}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive ? "bg-stone-900 text-white font-medium" : "text-stone-400 hover:text-white hover:bg-stone-900/60"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <I name={item.icon} size={18} className={isActive ? "text-white" : "text-stone-500"} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="p-3 border-t border-stone-800 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-900/60 transition-colors">
          <span className="w-9 h-9 shrink-0 rounded-full bg-stone-800 text-white text-xs font-medium flex items-center justify-center">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name || "Seller"}</p>
            <p className="text-xs text-stone-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="p-2 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <I name="LogOut" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
