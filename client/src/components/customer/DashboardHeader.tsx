import { useEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { I } from "../Shared";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { formatMoney } from "../../utils/money";
import { LogoMark } from "../Logo";

const NAV = [
  { to: "/dashboard", label: "Explore", menuLabel: "Explore products", icon: "Compass" },
  { to: "/library", label: "Downloads", menuLabel: "Downloads", icon: "Download" },
  { to: "/orders", label: "Orders", menuLabel: "Orders & receipts", icon: "FileText" },
];

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// Height is fixed at 72px + 1px border = 73px: the dashboard's sticky filter bar docks right below it
export default function DashboardHeader() {
  const { cartCount, summary, ownedCount, setIsCartOpen } = useCart();
  const { logout, user } = useAuth();
  const alert = useAlert();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSearch = searchParams.get("search") ?? "";

  const [searchQuery, setSearchQuery] = useState(activeSearch);
  // Keep the box in sync when the search changes elsewhere (e.g. "Clear", Back button)
  const [prevActiveSearch, setPrevActiveSearch] = useState(activeSearch);
  if (activeSearch !== prevActiveSearch) {
    setPrevActiveSearch(activeSearch);
    setSearchQuery(activeSearch);
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // "/" jumps to search (like GitHub and YouTube); Esc closes menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTypingTarget(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        desktopSearchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/dashboard?search=${encodeURIComponent(q)}` : "/dashboard");
    setMobileSearchOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const clearSearch = () => {
    setSearchQuery("");
    if (activeSearch) navigate("/dashboard");
    desktopSearchRef.current?.focus();
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    const ok = await alert.confirm({
      title: "Log out?",
      message: "You'll need to sign in again to access your cart and downloads.",
      confirmText: "Log out",
      danger: true,
    });
    if (ok) {
      logout();
      navigate("/login", { replace: true }); // Fresh login page — no "return to" from this session
    }
  };

  const initials = (user?.name ?? "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const firstName = user?.name?.split(" ")[0] ?? "Account";

  const searchField = (ref: RefObject<HTMLInputElement | null>, showHint: boolean) => (
    <form onSubmit={submitSearch} role="search" className="relative w-full">
      <I name="Search" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
      <input
        ref={ref}
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search mockups, templates, videos..."
        aria-label="Search products"
        className="peer w-full h-10 pl-10 pr-12 rounded-full bg-white border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 hover:border-stone-300 focus:outline-none focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 transition-[border-color,box-shadow] [&::-webkit-search-cancel-button]:hidden"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100"
        >
          <I name="X" size={14} />
        </button>
      ) : showHint ? (
        <kbd
          aria-hidden="true"
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md border border-stone-200 bg-stone-50 text-[11px] font-medium text-stone-500 peer-focus:hidden"
        >
          /
        </kbd>
      ) : null}
    </form>
  );

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#f7f6f3]/85 backdrop-blur-xl border-b border-stone-200">
      <div className="max-w-7xl mx-auto h-[72px] px-6 flex items-center gap-4 lg:gap-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0" aria-label="LaunchKit home">
          <LogoMark size={32} />
          <span className="hidden sm:block text-lg font-bold text-stone-900 tracking-tight">LaunchKit</span>
        </Link>

        {/* Primary navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm transition-colors ${
                  isActive ? "bg-white text-stone-900 font-medium border border-stone-200" : "text-stone-500 hover:text-stone-900 border border-transparent"
                }`
              }
            >
              <I name={item.icon} size={16} />
              {item.label}
              {item.to === "/library" && ownedCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-stone-200/80 text-stone-700 text-[11px] font-medium flex items-center justify-center tabular-nums">
                  {ownedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Search */}
        <div className="hidden md:block flex-1 max-w-md ml-auto">{searchField(desktopSearchRef, true)}</div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={() => setMobileSearchOpen((o) => !o)}
            aria-label={mobileSearchOpen ? "Close search" : "Search"}
            aria-expanded={mobileSearchOpen}
            className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200/60"
          >
            <I name={mobileSearchOpen ? "X" : "Search"} size={20} />
          </button>

          {/* Cart: quiet when empty, a solid pill with count + total when it has items.
              No colour transition: the cart loads after the page, and fading empty → full looks muddy */}
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label={`Open cart${cartCount ? ` (${cartCount} ${cartCount === 1 ? "item" : "items"})` : ", empty"}`}
            className={`h-10 rounded-full flex items-center gap-2 ${
              cartCount
                ? "pl-3.5 pr-4 bg-stone-900 text-white hover:bg-stone-700"
                : "w-10 justify-center text-stone-600 bg-white border border-stone-200 hover:border-stone-400"
            }`}
          >
            <I name="ShoppingBag" size={18} />
            {cartCount > 0 && (
              <>
                <span className="text-sm font-medium tabular-nums">{cartCount}</span>
                <span className="hidden xl:inline text-sm text-stone-300 tabular-nums border-l border-white/20 pl-2">
                  {formatMoney(summary.totalCents, summary.currency)}
                </span>
              </>
            )}
          </button>

          {/* Account menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="h-10 flex items-center gap-2 pl-1 pr-2 md:pr-3 rounded-full bg-white border border-stone-200 hover:border-stone-400 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white text-xs font-medium flex items-center justify-center">
                {initials}
              </span>
              <span className="hidden md:block text-sm font-medium text-stone-800 max-w-[120px] truncate">{firstName}</span>
              <I name="ChevronDown" size={16} className={`text-stone-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div role="menu" className="alert-toast-in absolute right-0 mt-2 w-72 z-50 bg-white rounded-2xl border border-stone-200 shadow-xl shadow-stone-900/10 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b border-stone-100">
                    <span className="w-11 h-11 shrink-0 rounded-full bg-stone-900 text-white font-medium flex items-center justify-center">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{user?.name ?? "Account"}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium uppercase tracking-wide">
                        {user?.role ?? "customer"}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5">
                    {NAV.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                      >
                        <I name={item.icon} size={16} className="text-stone-400" />
                        {item.menuLabel}
                        {item.to === "/library" && ownedCount > 0 && (
                          <span className="ml-auto text-xs text-stone-400 tabular-nums">{ownedCount}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                  <div className="p-1.5 border-t border-stone-100">
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <I name="LogOut" size={16} />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 py-3 border-t border-stone-200 bg-[#f7f6f3]">{searchField(mobileSearchRef, false)}</div>
      )}
    </header>
  );
}
