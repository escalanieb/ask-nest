import { useState } from "react";
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

// ── Login Gate ────────────────────────────────────────────────────────────────

function InsightLoginGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
              <h2 className="text-base font-semibold text-[#374151]">INSIGHT Login</h2>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                Sign in with your INSIGHT account to continue
              </p>
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

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in to INSIGHT"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or</span>
            </div>
          </div>

          {/* TALA SSO Button */}
          <TalaLoginButton
            loginUrl={`${INSIGHT_API_BASE}/auth/tala/redirect`}
            onSuccess={handleTalaSuccess}
            onLoginError={(err) => setError(err)}
            className="w-full justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          />
        </div>

        <p className="mt-4 text-center text-xs text-[#6b7280]">
          Use your INSIGHT account or TALA credentials.
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
