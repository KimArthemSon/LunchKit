import type { ReactNode } from "react";
import { Reveal, I } from "./Shared";

/* ─── Local icons (not in the shared set) ── */
const svg = (size: number, children: ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const MailIcon = ({ size = 18 }) => svg(size, <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>);
export const LockIcon = ({ size = 18 }) => svg(size, <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
export const KeyIcon = ({ size = 18 }) => svg(size, <><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" /><circle cx="16.5" cy="7.5" r=".5" fill="currentColor" /></>);
export const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/* ─── Shared class strings (light, paper theme to match the landing page) ── */
export const inputBase =
  "auth-input w-full pl-11 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 transition-[border-color,box-shadow] outline-none hover:border-stone-400 focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5";

export const primaryButton =
  "group w-full bg-stone-900 hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-full transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-900/15";

export const linkClass = "font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900 transition-colors";

export function Field({ id, label, icon, aside, children }: { id: string; label: string; icon: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={id} className="text-sm font-medium text-stone-800">{label}</label>
        {aside}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
    >
      <I name={shown ? "EyeOff" : "Eye"} size={18} />
    </button>
  );
}

export function SocialButtons({ onGoogle }: { onGoogle: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onGoogle}
        className="flex items-center justify-center gap-2.5 py-3 bg-white border border-stone-300 rounded-full text-stone-900 font-medium text-sm hover:border-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-900/10"
      >
        <GoogleLogo /> Google
      </button>
      <button
        type="button"
        disabled
        title="GitHub sign-in is coming soon"
        className="flex items-center justify-center gap-2 py-3 bg-stone-100 border border-stone-200 rounded-full text-stone-400 text-sm font-medium cursor-not-allowed"
      >
        <I name="Github" size={18} /> GitHub <span className="text-xs text-stone-400">· soon</span>
      </button>
    </div>
  );
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-7" role="separator">
      <div className="h-px flex-1 bg-stone-200" />
      <span className="text-xs text-stone-500">{label}</span>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      <I name="AlertTriangle" size={18} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <>
      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      <span className="sr-only">{label}</span>
    </>
  );
}

/* ─── Page shell: editorial intro on the left, white form card on the right ── */
export function AuthShell({ eyebrow, title, intro, points, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  points: { title: string; text: string }[];
  children: ReactNode;
}) {
  return (
    <section className="min-h-screen bg-[#f7f6f3] text-stone-900 pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        <Reveal className="hidden lg:block lg:pt-10">
          <p className="text-sm font-medium text-stone-500 mb-4">{eyebrow}</p>
          <h2 className="text-5xl font-semibold tracking-[-0.035em] leading-[1.04] mb-6">{title}</h2>
          <p className="text-lg text-stone-600 leading-relaxed max-w-md mb-12">{intro}</p>
          <div className="space-y-6 max-w-md">
            {points.map((p) => (
              <div key={p.title} className="border-l border-stone-300 pl-5">
                <p className="font-semibold mb-1">{p.title}</p>
                <p className="text-sm text-stone-600 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100} className="w-full max-w-md mx-auto lg:mr-0">
          <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-10">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}
