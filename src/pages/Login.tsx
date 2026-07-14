import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TalaLoginButton } from "@tala/sso-react";
import { useAuthStore } from "../stores/useAuthStore";
import NestLogo from "../components/NestLogo";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const loginWithTala = useAuthStore((s) => s.loginWithTala);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleTalaSuccess(code: string, state: string) {
    fetch(`${API_BASE}/auth/tala/callback?code=${code}&state=${state}`, {
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json?.data) {
          loginWithTala(json.data);
          navigate("/");
        } else {
          setError(json?.error ?? "TALA login failed.");
        }
      })
      .catch(() => setError("Network error during TALA login."));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        {/* Logo / Title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <NestLogo width={140} />
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
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

        {/* TALA SSO */}
        <TalaLoginButton
          loginUrl={`${API_BASE}/auth/tala/redirect`}
          onSuccess={handleTalaSuccess}
          onLoginError={(err) => setError(err)}
          className="w-full justify-center border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        />

        <p className="mt-6 text-center text-xs text-slate-400">
          Use your admin or viewer account credentials.
        </p>
      </div>
    </div>
  );
}
