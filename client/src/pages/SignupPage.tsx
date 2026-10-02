import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { I, useScrollReveal } from "../components/Shared";
import { useAuth, type User } from "../context/AuthContext";
import { API_URL, apiRequest, errorMessage } from "../api/http";
import { postLoginPath } from "../utils/authRoutes";
import {
  AuthShell, ErrorBanner, Field, LockIcon, MailIcon, OrDivider, PasswordToggle, SocialButtons, Spinner, inputBase, linkClass, primaryButton,
} from "../components/AuthUI";

type Role = "customer" | "seller";

const ROLES: { value: Role; icon: string; title: string; text: string }[] = [
  { value: "customer", icon: "ShoppingBag", title: "Buy assets", text: "Browse and download creator products" },
  { value: "seller", icon: "DollarSign", title: "Sell assets", text: "Open a storefront and get paid" },
];

const POINTS = [
  { title: "Buy what you need", text: "Mockups, video templates and pitch decks, ready to download." },
  { title: "Or sell what you make", text: "Open a storefront in minutes and get paid automatically." },
  { title: "Free to join", text: "No subscription. Pay only for the assets you buy." },
];

const RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
// Monochrome meter: only a weak password gets a warning colour
const STRENGTH = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Fair", bar: "bg-stone-900", text: "text-stone-700" },
  { label: "Good", bar: "bg-stone-900", text: "text-stone-700" },
  { label: "Strong", bar: "bg-stone-900", text: "text-stone-900" },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useScrollReveal();

  const set = (key: keyof typeof formData) => (value: string) => setFormData((f) => ({ ...f, [key]: value }));

  const strength = RULES.filter((r) => r.test(formData.password)).length;
  const passwordsMatch = formData.password === formData.confirmPassword;
  const isFormValid = agreeToTerms && formData.name.trim() && formData.email && passwordsMatch && strength >= 2;

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest<User & { token: string }>("/api/auth/register", null, {
        method: "POST",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      });
      const { token, ...user } = data;
      login(user, token);
      // Same routing as login: honours onboarding and the page that sent them here
      navigate(postLoginPath(user, location), { replace: true });
    } catch (err) {
      setError(errorMessage(err) || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const level = formData.password ? STRENGTH[strength] : null;

  return (
    <AuthShell
      eyebrow="Join LaunchKit"
      title="One account to buy and sell creator assets."
      intro="Get the assets that make your project look finished, or sell your own to the developers who need them."
      points={POINTS}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2">Create your account</h1>
        <p className="text-stone-600 text-sm">
          Already have one?{" "}
          <Link to="/login" className={linkClass}>
            Log in
          </Link>
        </p>
      </div>

      <SocialButtons onGoogle={() => { window.location.href = `${API_URL}/api/auth/google`; }} />
      <OrDivider label="or sign up with email" />

      {error && <ErrorBanner message={error} />}

      <form onSubmit={handleSignup} className="space-y-5">
        {/* Role picker */}
        <fieldset>
          <legend className="text-sm font-medium text-stone-800 mb-2">I want to</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const active = formData.role === r.value;
              return (
                <label
                  key={r.value}
                  className={`relative cursor-pointer rounded-xl border p-3.5 transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-stone-900/10 ${
                    active ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={active}
                    onChange={() => set("role")(r.value)}
                    className="sr-only"
                  />
                  <span className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? "border-stone-900" : "border-stone-300"}`}>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />}
                  </span>
                  <span className={`w-9 h-9 mb-2.5 rounded-lg flex items-center justify-center ${active ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>
                    <I name={r.icon} size={18} />
                  </span>
                  <span className="block text-sm font-semibold text-stone-900">{r.title}</span>
                  <span className="block text-xs text-stone-500 mt-0.5 leading-snug">{r.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field id="signup-name" label="Full name" icon={<I name="User" size={18} />}>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={formData.name}
            onChange={(e) => set("name")(e.target.value)}
            placeholder="Jane Doe"
            required
            className={inputBase}
          />
        </Field>

        <Field id="signup-email" label="Email address" icon={<MailIcon />}>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => set("email")(e.target.value)}
            placeholder="you@example.com"
            required
            className={inputBase}
          />
        </Field>

        <div>
          <Field id="signup-password" label="Password" icon={<LockIcon />}>
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => set("password")(e.target.value)}
              placeholder="Create a password"
              required
              aria-describedby="password-rules"
              className={`${inputBase} pr-12`}
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </Field>

          <div id="password-rules" className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 h-1.5 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`flex-1 rounded-full transition-colors duration-300 ${level && i < strength ? level.bar : "bg-stone-200"}`} />
                ))}
              </div>
              <span className={`text-xs font-semibold w-16 text-right ${level ? level.text : "text-stone-400"}`}>
                {level ? level.label : "Strength"}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
              {RULES.map((r) => {
                const ok = r.test(formData.password);
                return (
                  <li key={r.label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? "text-stone-900" : "text-stone-400"}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${ok ? "bg-stone-900 text-white" : "bg-stone-100"}`}>
                      {ok ? <I name="Check" size={10} /> : <span className="w-1 h-1 rounded-full bg-stone-400" />}
                    </span>
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div>
          <Field id="signup-confirm" label="Confirm password" icon={<LockIcon />}>
            <input
              id="signup-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => set("confirmPassword")(e.target.value)}
              placeholder="Re-enter your password"
              required
              aria-invalid={!!formData.confirmPassword && !passwordsMatch}
              className={`${inputBase} pr-12 ${formData.confirmPassword && !passwordsMatch ? "border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-500/10" : ""}`}
            />
            {formData.confirmPassword && (
              <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${passwordsMatch ? "text-stone-900" : "text-red-500"}`}>
                <I name={passwordsMatch ? "Check" : "X"} size={18} />
              </span>
            )}
          </Field>
          {formData.confirmPassword && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-600">Passwords don't match yet.</p>
          )}
        </div>

        <label htmlFor="terms" className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            id="terms"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 shrink-0 rounded accent-stone-900 cursor-pointer"
          />
          <span className="text-sm text-stone-600 leading-relaxed">
            I agree to the <span className="text-stone-900 font-medium">Terms of Service</span> and{" "}
            <span className="text-stone-900 font-medium">Privacy Policy</span>.
          </span>
        </label>

        <button type="submit" disabled={!isFormValid || isLoading} className={primaryButton}>
          {isLoading ? (
            <Spinner label="Creating account" />
          ) : (
            <>
              {formData.role === "seller" ? "Create seller account" : "Create account"}
              <I name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
