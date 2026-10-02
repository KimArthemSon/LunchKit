import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { I, useScrollReveal } from "../components/Shared";
import { useAuth, type User } from "../context/AuthContext";
import { API_URL, apiRequest, errorMessage } from "../api/http";
import { postLoginPath } from "../utils/authRoutes";
import {
  AuthShell, ErrorBanner, Field, KeyIcon, LockIcon, MailIcon, OrDivider, PasswordToggle, SocialButtons, Spinner, inputBase, linkClass, primaryButton,
} from "../components/AuthUI";

const POINTS = [
  { title: "Your storefront, as you left it", text: "Products, orders and payouts are all where you expect them." },
  { title: "No password? No problem", text: "Sign in with a one-time code sent to your email." },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Auth State
  const [method, setMethod] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useScrollReveal();

  // Single place that finishes a login: save the session, then go where this user's role belongs
  const completeLogin = (data: User & { token: string }) => {
    const { token, ...user } = data;
    login(user, token);
    navigate(postLoginPath(user, location), { replace: true });
  };

  const post = <T,>(path: string, body: unknown) =>
    apiRequest<T>(path, null, { method: "POST", body: JSON.stringify(body) });

  const switchMethod = (next: "password" | "otp") => {
    setMethod(next);
    setIsOtpSent(false);
    setOtp("");
    setError("");
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      completeLogin(await post<User & { token: string }>("/api/auth/login", { email: email.trim(), password }));
    } catch (err) {
      // Provide a more helpful error message if the account doesn't exist
      const message = errorMessage(err);
      setError(message.includes("Invalid")
        ? "Account not found or wrong password. Please check your credentials or sign up."
        : message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await post("/api/auth/request-otp", { email: email.trim() });
      setIsOtpSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      completeLogin(await post<User & { token: string }>("/api/auth/verify-otp", { email: email.trim(), otp }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const submitLabel = method === "password" ? "Sign in" : isOtpSent ? "Verify & sign in" : "Send login code";
  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
      active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
    }`;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Pick up right where you left off."
      intro="Sign in to get back to your library, your orders or your storefront."
      points={POINTS}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2">Sign in</h1>
        <p className="text-stone-600 text-sm">
          New to LaunchKit?{" "}
          <Link to="/signup" className={linkClass}>
            Create an account
          </Link>
        </p>
      </div>

      <SocialButtons onGoogle={handleGoogleLogin} />
      <OrDivider label="or with email" />

      {/* Method Toggle */}
      <div className="flex bg-stone-100 rounded-full p-1 mb-6" role="tablist" aria-label="Sign-in method">
        <button type="button" role="tab" aria-selected={method === "password"} onClick={() => switchMethod("password")} className={tabClass(method === "password")}>
          <LockIcon size={15} /> Password
        </button>
        <button type="button" role="tab" aria-selected={method === "otp"} onClick={() => switchMethod("otp")} className={tabClass(method === "otp")}>
          <KeyIcon size={15} /> Email code
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <form
        onSubmit={method === "password" ? handlePasswordLogin : isOtpSent ? handleVerifyOtp : handleRequestOtp}
        className="space-y-5"
      >
        {/* Email: replaced by a summary chip once a code is sent */}
        {method === "otp" && isOtpSent ? (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center"><MailIcon size={16} /></span>
              <div className="min-w-0">
                <p className="text-xs text-stone-500">Code sent to</p>
                <p className="text-sm text-stone-900 font-medium truncate">{email.trim()}</p>
              </div>
            </div>
            <button type="button" onClick={() => switchMethod("otp")} className="shrink-0 text-xs font-medium text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900">
              Change
            </button>
          </div>
        ) : (
          <Field id="login-email" label="Email address" icon={<MailIcon />}>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={inputBase}
            />
          </Field>
        )}

        {method === "password" && (
          <Field
            id="login-password"
            label="Password"
            icon={<LockIcon />}
            aside={
              <button type="button" onClick={() => switchMethod("otp")} className="text-xs text-stone-500 hover:text-stone-900 transition-colors">
                Forgot password? Use a code
              </button>
            }
          >
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className={`${inputBase} pr-12`}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </Field>
        )}

        {method === "otp" && !isOtpSent && (
          <p className="text-xs text-stone-500 -mt-2">We'll email you a 6-digit code. No password needed.</p>
        )}

        {method === "otp" && isOtpSent && (
          <div>
            <label htmlFor="login-otp" className="block text-sm font-medium text-stone-800 mb-2">6-digit code</label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              minLength={6}
              placeholder="••••••"
              className="auth-input w-full py-3.5 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-300 outline-none transition-[border-color,box-shadow] focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5 text-center text-2xl tracking-[0.6em] font-semibold tabular-nums"
            />
            <div className="flex items-center justify-between mt-2.5 text-xs">
              <span className="text-stone-500">
                {import.meta.env.DEV ? "Dev: the code is printed in the backend terminal." : "Check your inbox and spam folder."}
              </span>
              <button type="button" disabled={isLoading} onClick={() => handleRequestOtp()} className="font-medium text-stone-900 underline underline-offset-4 decoration-stone-300 hover:decoration-stone-900 disabled:opacity-50">
                Resend
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (isOtpSent && otp.length < 6)}
          className={primaryButton}
        >
          {isLoading ? (
            <Spinner label="Signing in" />
          ) : (
            <>
              {submitLabel}
              <I name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-stone-500 leading-relaxed">
        By signing in you agree to our <span className="text-stone-700">Terms</span> and <span className="text-stone-700">Privacy Policy</span>.
      </p>
    </AuthShell>
  );
}
