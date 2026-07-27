import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { TalaLoginButton } from "@tala/sso-react";
import NewsWorkspace from "@/components/insight/NewsWorkspace";
import {
  getInsightToken,
  setInsightToken,
  clearInsightToken,
  insightFetch,
  type InsightApiError,
} from "@/services/insightApi";

const INSIGHT_API_BASE = import.meta.env.VITE_INSIGHT_API_URL ?? "http://127.0.0.1:8080/api";

// Dedicated QueryClient for INSIGHT — isolated from ask-nest's cache
const insightQueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

interface InsightUser {
  id: number;
  name: string;
  email: string;
}

// ── Helper to find parent TALA token ──────────────────────────────────────────
function getParentTalaToken(): string | null {
  try {
    const raw = localStorage.getItem("commsdash-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

// ── Login Gate ────────────────────────────────────────────────────────────────

function InsightLoginGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Attempt auto-login using parent token on mount
  useEffect(() => {
    const parentToken = getParentTalaToken();
    if (!parentToken) return;

    setLoading(true);
    fetch(`${INSIGHT_API_BASE}/auth/tala/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tala_token: parentToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data?.token) {
          setInsightToken(json.data.token);
          onAuthenticated();
        }
      })
      .catch(() => {
        // Silent failure — do nothing, show regular login gate
      })
      .finally(() => setLoading(false));
  }, [onAuthenticated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await insightFetch<{ success: boolean; data: { token: string; user: InsightUser } }>(
        "/auth/login",
        "POST",
        { email, password }
      );
      setInsightToken(res.data.token);
      toast.success(`Welcome, ${res.data.user.name}`);
      onAuthenticated();
    } catch (err) {
      const apiErr = err as InsightApiError;
      setError(apiErr.message || "Login failed. Check your INSIGHT credentials.");
    } finally {
      setLoading(false);
    }
  }

  function handleTalaSuccess(code: string, state: string) {
    setError("");
    setLoading(true);
    fetch(`${INSIGHT_API_BASE}/auth/tala/callback?code=${code}&state=${state}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("TALA authentication on INSIGHT failed.");
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data?.token) {
          setInsightToken(json.data.token);
          toast.success(`Welcome via TALA, ${json.data.user?.name || "User"}`);
          onAuthenticated();
        } else {
          setError(json?.error ?? "TALA callback returned invalid data.");
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Network error during TALA login."))
      .finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f8ff] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm font-semibold text-[#6b7280]">Connecting to INSIGHT...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#f0f8ff] px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-lg">
          {/* Icon + heading */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-6 text-emerald-600"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#374151]">INSIGHT Newsroom</h2>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Access require authentication
              </p>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {/* TALA SSO Button - Make it primary and prominent */}
          <TalaLoginButton
            loginUrl={`${INSIGHT_API_BASE}/auth/tala/redirect`}
            onSuccess={handleTalaSuccess}
            onLoginError={(err) => setError(err)}
            className="w-full justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold py-2 px-4 shadow transition-colors"
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or login with credentials</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6]/60 px-3 py-2 text-sm text-[#374151] outline-none placeholder:text-[#9ca3af] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#e5e7eb] bg-[#f3f4f6]/60 px-3 py-2 text-sm text-[#374151] outline-none placeholder:text-[#9ca3af] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-[#e5e7eb] py-2 text-sm font-semibold text-[#374151] transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#6b7280]">
          Authorized personnel only.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InsightPage() {
  // Track whether we currently have a valid INSIGHT token
  const [hasToken, setHasToken] = useState(() => Boolean(getInsightToken()));

  function handleLogout() {
    clearInsightToken();
    setHasToken(false);
    insightQueryClient.clear();
  }

  return (
    <QueryClientProvider client={insightQueryClient}>
      <Toaster position="top-right" richColors />

      <div className="flex h-full flex-col overflow-hidden bg-[#f0f8ff]">
        {/* Page header */}
        <header className="shrink-0 sticky top-0 z-10 border-b border-[#e5e7eb] bg-white/80 backdrop-blur-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 text-emerald-600"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[#374151] leading-none">INSIGHT</h1>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Newsroom · RSS intelligence dashboard
                </p>
              </div>
            </div>

            {hasToken && (
              <button
                onClick={handleLogout}
                className="text-xs text-[#6b7280] hover:text-red-500 transition-colors"
              >
                Sign out of INSIGHT
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        {hasToken ? (
          <main className="flex-1 overflow-y-auto px-8 py-8 min-w-0">
            <NewsWorkspace />
          </main>
        ) : (
          <InsightLoginGate onAuthenticated={() => setHasToken(true)} />
        )}
      </div>
    </QueryClientProvider>
  );
}
