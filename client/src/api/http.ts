export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Preview mode: a frontend-only deploy (e.g. Vercel) with no backend behind it. Sign-in and
// every API call are switched off, so visitors never reach Google sign-in or a localhost URL.
// On by default for production builds without VITE_API_URL; VITE_PREVIEW_MODE=true|false overrides.
const previewFlag = import.meta.env.VITE_PREVIEW_MODE;
export const PREVIEW_MODE = previewFlag ? previewFlag === "true" : import.meta.env.PROD && !import.meta.env.VITE_API_URL;
export const PREVIEW_MESSAGE = "Sign-in is turned off in this public preview. Only the website is deployed here; accounts, the store and payments run on the project's own server.";

// Carries the HTTP status, the server's machine-readable `code` and the full body,
// so callers can react to specific cases (e.g. PRICE_CHANGED, PAYMENT_FAILED).
export class ApiError extends Error {
  status: number;
  code?: string;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = typeof data.code === "string" ? data.code : undefined;
    this.data = data;
  }
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");

export async function apiRequest<T>(path: string, token: string | null, options: RequestInit = {}): Promise<T> {
  if (PREVIEW_MODE) throw new ApiError(PREVIEW_MESSAGE, 503, { code: "PREVIEW_MODE" });
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // Let the browser set the multipart boundary for FormData
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data);
  return data as T;
}
