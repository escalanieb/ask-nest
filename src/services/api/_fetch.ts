import { useAuthStore } from "../../stores/useAuthStore";

import { sessionFetch, sessionGeneration, assertSession } from "../../lib/session";

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
  const expected = sessionGeneration();
  const token = getToken();
  if (!token) return null;
  try {
    const res = await sessionFetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    assertSession(expected);
    useAuthStore.setState({ token: data.token, user: data.user });
    return data.token as string;
  } catch {
    assertSession(expected);
    return null;
  }
}

export async function apiRequest(path: string, options?: RequestInit): Promise<Response> {
  const expected = sessionGeneration();
  if (
    path.startsWith("/tipas/") &&
    !useAuthStore.getState().user?.capabilities?.includes("tipas.use")
  )
    throw new Error("TIPAS is available to communications only.");
  const extraHeaders = options?.headers as Record<string, string> | undefined;

  let res = await sessionFetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(extraHeaders),
  });

  // On 401: attempt a token refresh once, then retry
  if (res.status === 401) {
    const newToken = await tryRefresh();
    assertSession(expected);
    if (newToken) {
      res = await sessionFetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${newToken}`,
          ...extraHeaders,
        },
      });
      if (res.status === 401) {
        useAuthStore.getState().clearSession();
        throw new Error("Session expired. Please log in again.");
      }
      return res;
    }
    // Refresh failed — clear session so the login screen shows
    useAuthStore.getState().clearSession();
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const generation = sessionGeneration();
  const res = await apiRequest(path, options);

  if (!res.ok) {
    const body = await res.text();
    if ([403, 503].includes(res.status)) {
      let message: string | undefined;
      try {
        message = (JSON.parse(body) as { message?: string }).message;
      } catch {
        /* Non-JSON errors use the fallback below. */
      }
      if (message) throw new Error(message);
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T;
  assertSession(generation);
  return data;
}
