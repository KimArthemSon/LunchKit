import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import SellerSidebar from "./SellerSidebar";
import { SellerNavContext } from "./sellerNav";

export default function SellerDashboardLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the page changes
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setNavOpen(false);
  }

  // Esc closes the drawer; lock page scroll while it's open
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  return (
    <SellerNavContext.Provider value={{ openNav: () => setNavOpen(true) }}>
      <div className="min-h-screen bg-stone-950 text-white flex">
        {/* Desktop: pinned to the viewport, so navigation never scrolls away */}
        <div className="hidden md:block sticky top-0 h-screen shrink-0">
          <SellerSidebar />
        </div>

        {/* Mobile: slide-in drawer */}
        {navOpen && (
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Seller navigation">
            <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
            <div className="alert-toast-in absolute inset-y-0 left-0 shadow-2xl">
              <SellerSidebar onNavigate={() => setNavOpen(false)} onClose={() => setNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">{children}</div>
      </div>
    </SellerNavContext.Provider>
  );
}
