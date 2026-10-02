import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth, type User } from "../context/AuthContext";
import { apiRequest } from "../api/http";
import { homePathFor } from "../utils/authRoutes";

// Landing page for Google sign-in: the server redirects here with ?token=...
export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      navigate("/login?error=Authentication failed", { replace: true });
      return;
    }

    let cancelled = false;
    // Load the real user so the app knows their name, email and role
    apiRequest<User>("/api/auth/me", token)
      .then((user) => {
        if (cancelled) return;
        login(user, token);
        // replace: the token URL must not stay in history (Back shouldn't return here)
        navigate(homePathFor(user), { replace: true });
      })
      .catch(() => !cancelled && navigate("/login?error=Authentication failed", { replace: true }));
    return () => { cancelled = true; };
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
