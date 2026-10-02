import { createContext, useContext } from "react";

// Lets the per-page SellerHeader open the mobile navigation drawer owned by the layout
export const SellerNavContext = createContext<{ openNav: () => void }>({ openNav: () => {} });
export const useSellerNav = () => useContext(SellerNavContext);

export const SELLER_NAV = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", href: "/seller/dashboard", icon: "BarChart3" }],
  },
  {
    group: "Store",
    items: [
      { label: "Products", href: "/seller/products", icon: "Package" },
      { label: "Orders", href: "/seller/orders", icon: "ShoppingBag" },
    ],
  },
  {
    group: "Money",
    items: [{ label: "Earnings & payouts", href: "/seller/earnings", icon: "Wallet" }],
  },
];
