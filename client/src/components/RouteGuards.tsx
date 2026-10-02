import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathFor, postLoginPath } from "../utils/authRoutes";

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Landing / login / signup: a logged-in user is sent to their dashboard instead
// (this is what makes the browser Back button return to the dashboard, not the login form)
export function GuestOnly({ children }: { children: ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullPageSpinner />;
  if (token) return <Navigate to={postLoginPath(user, location)} replace />;
  return <>{children}</>;
}

interface RequireAuthProps {
  children: ReactNode;
  role?: "customer" | "seller";
}

// Logged-in pages: guests go to /login, users who haven't picked a role go to onboarding,
// and each role is kept in its own area (a seller on a customer page goes to the seller
// dashboard and vice versa).
export function RequireAuth({ children, role }: RequireAuthProps) {
  const { token, user, isLoading, loggedOut } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!token) {
    // Remember the page only when the session ended on its own (expired) or a guest opened
    // a link — never after a deliberate logout, or the *next* person to log in on this
    // browser would be sent to the previous user's page.
    return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location }} />;
  }

  const onOnboarding = location.pathname === "/onboarding";
  if (user?.needsOnboarding && !onOnboarding) return <Navigate to="/onboarding" replace />;
  if (user && !user.needsOnboarding && onOnboarding) return <Navigate to={homePathFor(user)} replace />;
  if (role && user && user.role !== role) return <Navigate to={homePathFor(user)} replace />;

  return <>{children}</>;
}
