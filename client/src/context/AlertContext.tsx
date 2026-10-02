import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { I } from "../components/Shared";

type AlertType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  type: AlertType;
  title?: string;
  message: string;
}

interface ToastOptions {
  title?: string;
  duration?: number; // ms; 0 = stays until closed
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // red confirm button for destructive actions
}

type Notify = (message: string, options?: ToastOptions) => void;

interface AlertContextType {
  success: Notify;
  error: Notify;
  warning: Notify;
  info: Notify;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const DEFAULT_DURATION: Record<AlertType, number> = { success: 4000, info: 4000, warning: 5000, error: 6000 };

const STYLES: Record<AlertType, { icon: string; accent: string; title: string }> = {
  success: { icon: "Check", accent: "text-green-400 bg-green-500/10 border-green-500/30", title: "Success" },
  error: { icon: "X", accent: "text-red-400 bg-red-500/10 border-red-500/30", title: "Error" },
  warning: { icon: "AlertTriangle", accent: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", title: "Warning" },
  info: { icon: "Info", accent: "text-blue-400 bg-blue-500/10 border-blue-500/30", title: "Info" },
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: AlertType, message: string, options: ToastOptions = {}) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, type, message, title: options.title }].slice(-MAX_TOASTS));
    const duration = options.duration ?? DEFAULT_DURATION[type];
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve }));
  }, []);

  const closeConfirm = useCallback((ok: boolean) => {
    setConfirmState((state) => {
      state?.resolve(ok);
      return null;
    });
  }, []);

  // Esc cancels / Enter confirms the open dialog
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm(false);
      if (e.key === "Enter") closeConfirm(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmState, closeConfirm]);

  const value = useMemo<AlertContextType>(() => ({
    success: (message, options) => push("success", message, options),
    error: (message, options) => push("error", message, options),
    warning: (message, options) => push("warning", message, options),
    info: (message, options) => push("info", message, options),
    confirm,
  }), [push, confirm]);

  return (
    <AlertContext.Provider value={value}>
      {children}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100%-2rem)] max-w-sm pointer-events-none" aria-live="polite">
        {toasts.map((toast) => {
          const style = STYLES[toast.type];
          return (
            <div
              key={toast.id}
              role={toast.type === "error" ? "alert" : "status"}
              className="alert-toast-in pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#0f0f17]/95 backdrop-blur border border-white/10 shadow-2xl shadow-black/50"
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${style.accent}`}>
                <I name={style.icon} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{toast.title ?? style.title}</p>
                <p className="text-sm text-gray-400 break-words">{toast.message}</p>
              </div>
              <button onClick={() => dismiss(toast.id)} className="shrink-0 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10" aria-label="Dismiss">
                <I name="X" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => closeConfirm(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="alert-toast-in w-full max-w-md bg-[#0f0f17] border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${STYLES[confirmState.danger ? "error" : "warning"].accent}`}>
                <I name="AlertTriangle" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{confirmState.title ?? "Are you sure?"}</h3>
                <p className="mt-1 text-sm text-gray-400">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => closeConfirm(false)} className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/10">
                {confirmState.cancelText ?? "Cancel"}
              </button>
              <button
                autoFocus
                onClick={() => closeConfirm(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-white transition-colors ${
                  confirmState.danger ? "bg-red-600 hover:bg-red-500" : "bg-purple-600 hover:bg-purple-500"
                }`}
              >
                {confirmState.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used within AlertProvider");
  return context;
}
