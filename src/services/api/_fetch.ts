import { useAuthStore } from "../../stores/useAuthStore";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

function getToken(): string | null {
  return useAuthStore.getState().token;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function tryRefresh(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    useAuthStore.setState({ token: data.token });
    return data.token as string;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const extraHeaders = options?.headers as Record<string, string> | undefined;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(extraHeaders),
  });

  // On 401: attempt a token refresh once, then retry
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${newToken}`,
          ...extraHeaders,
        },
      });
      if (!retryRes.ok) {
        const body = await retryRes.text();
        throw new Error(`API error ${retryRes.status}: ${body}`);
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json() as Promise<T>;
    }
    // Refresh failed — clear session so the login screen shows
    useAuthStore.setState({ token: null, user: null });
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
