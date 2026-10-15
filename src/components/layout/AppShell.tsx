import { accessContext } from "../../lib/teamAccess";
import { useEffect, useState } from "react";
import TeamAccent from "./TeamAccent";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import AppSidebar from "./AppSidebar";

/**
 * AppShell — wraps every authenticated page.
 * Renders the left icon sidebar + the page content side-by-side.
 * Also acts as the auth guard (redirects to /login if no token).
 */
export default function AppShell() {
  const token = useAuthStore((s) => s.token);

  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const identity = useAuthStore((s) => accessContext(s.user));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    const verify = () => {
      void hydrate().catch((e: Error) => {
        if (active && e.name !== "AbortError") setError(e.message);
      });
    };
    verify();
    const timer = window.setInterval(verify, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, hydrate]);

  if (!token) return <Navigate to="/login" replace />;

  if (error)
    return (
      <div className="flex h-screen items-center justify-center gap-4 text-sm">
        <p>{error}</p>
        <button
          onClick={() => {
            setError("");
            void hydrate().catch((e: Error) => setError(e.message));
          }}
        >
          Retry
        </button>
        <button onClick={() => void useAuthStore.getState().logout()}>Sign out</button>
      </div>
    );
  if (!hydrated)
    return (
      <div className="flex h-screen items-center justify-center text-sm">
        Verifying team membership…
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <TeamAccent key={identity} />
      <AppSidebar />
      <div key={identity} className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
