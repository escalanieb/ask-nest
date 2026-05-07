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

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
