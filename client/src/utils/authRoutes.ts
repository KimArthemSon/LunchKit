import type { Location } from "react-router-dom";
import type { User } from "../context/AuthContext";

const GUEST_PATHS = ["/", "/login", "/signup"];
const CUSTOMER_PATHS = ["/dashboard", "/checkout", "/orders", "/library"];

const matches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

// Where a logged-in user "lives" — used after login and whenever they hit a guest-only page
export const homePathFor = (user: User | null) => {
  if (user?.needsOnboarding) return "/onboarding";
  if (user?.role === "seller") return "/seller/dashboard";
  return "/dashboard";
};

// Role-based access: seller area for sellers, storefront/account pages for customers
export const canAccess = (user: User | null, pathname: string) => {
  if (matches(pathname, "/seller")) return user?.role === "seller";
  if (CUSTOMER_PATHS.some((base) => matches(pathname, base))) return user?.role === "customer";
  return true;
};

// After logging in: return to the page that sent them to /login (e.g. checkout) — but only
// if this user's role may open it. A page remembered from someone else's session (e.g. a
// customer page, then a seller logs in) must never win over the user's own home.
export const postLoginPath = (user: User | null, location: Location) => {
  const from = (location.state as { from?: Location } | null)?.from;
  if (
    from &&
    user &&
    !user.needsOnboarding &&
    !GUEST_PATHS.includes(from.pathname) &&
    canAccess(user, from.pathname)
  ) {
    return `${from.pathname}${from.search}`;
  }
  return homePathFor(user);
};
