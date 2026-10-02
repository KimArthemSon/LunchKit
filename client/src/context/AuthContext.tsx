import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiRequest, ApiError } from "../api/http";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  needsOnboarding?: boolean; // <-- Added to track if user needs to choose a role
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean; // True while we have a token but haven't loaded the user yet
  loggedOut: boolean; // True after an explicit logout — guards then don't remember a "return to" page
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read the saved session synchronously so the very first render already knows who is
// logged in — otherwise route guards would briefly see "logged out" and redirect wrongly.
const readStoredUser = (): User | null => {
  if (!localStorage.getItem("token")) return null;
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null");
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [userLoadFailed, setUserLoadFailed] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  const login = useCallback((userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    setUserLoadFailed(false);
    setLoggedOut(false);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData)); // Saves needsOnboarding too
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setLoggedOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  // Have a token but no user (e.g. right after Google sign-in)? Load it from the API.
  useEffect(() => {
    if (!token || user || userLoadFailed) return;
    let cancelled = false;
    apiRequest<User>("/api/auth/me", token)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        localStorage.setItem("user", JSON.stringify(me));
      })
      .catch((err) => {
        if (cancelled) return;
        // Expired/invalid token → sign out (keeping the "return to" page, since the user
        // didn't choose to leave). Server unreachable → keep the session.
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } else setUserLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, [token, user, userLoadFailed]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loggedOut, isLoading: !!token && !user && !userLoadFailed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
