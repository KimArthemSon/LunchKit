export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
