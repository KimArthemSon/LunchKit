import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../api/http";

// Runs `fn` whenever `key` changes (pass null to skip, e.g. while logged out).
// `fn` must be stable (wrap it in useCallback). Results from stale requests are ignored.
export function useAsync<T>(key: string | null, fn: () => Promise<T>) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null);
  const requestKey = key === null ? null : `${key}#${reloadCount}`;

  useEffect(() => {
    if (requestKey === null) return;
    let cancelled = false;
    fn()
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: "" }))
      .catch((err) => !cancelled && setResult({ key: requestKey, data: null, error: errorMessage(err) }));
    return () => { cancelled = true; };
  }, [requestKey, fn]);

  const current = result && result.key === requestKey ? result : null;
  const reload = useCallback(() => setReloadCount((c) => c + 1), []);

  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    isLoading: requestKey !== null && !current,
    reload,
  };
}
