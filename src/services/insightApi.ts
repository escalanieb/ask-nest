/**
 * insightApi.ts
 *
 * API client for the INSIGHT backend (Laravel Sanctum).
 * INSIGHT uses its own separate Sanctum token stored under the
 * "insight_auth_token" localStorage key — completely independent
 * from ask-nest's JWT token.
 */

export interface InsightApiError extends Error {
  status?: number;
  error?: string;
  errors?: string[];
}

const STORAGE_KEY = "insight_auth_token";

function getBaseUrl(): string {
  return import.meta.env.VITE_INSIGHT_API_URL ?? "http://127.0.0.1:8080/api";
}

export function getInsightToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setInsightToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearInsightToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

async function readErrorResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  return { message: text || "An unknown API error occurred" };
}

export async function insightFetch<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown> | FormData,
  options?: { responseType?: "json" | "blob" }
): Promise<T> {
  const headers: HeadersInit = {
    Accept: options?.responseType === "blob" ? "*/*" : "application/json",
  };

  // Use INSIGHT's own Sanctum token, not ask-nest's JWT
  const token = getInsightToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = { method, headers };

  if (body) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
      config.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${getBaseUrl()}${url}`, config);

  if (!res.ok) {
    const errorBody = await readErrorResponse(res);
    const error: InsightApiError = new Error(
      errorBody.message || "An unknown API error occurred"
    );
    error.status = res.status;
    error.error = errorBody.error;
    error.errors = errorBody.errors;
    throw error;
  }

  if (options?.responseType === "blob") {
    return res.blob() as T;
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return res.json();
  }

  return null as T;
}

