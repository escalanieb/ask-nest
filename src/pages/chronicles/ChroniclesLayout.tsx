import { Link, Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ChevronRight } from "lucide-react";

/**
 * Shell for every Chronicles screen: ask-nest's own page chrome (Home breadcrumb, scrolling
 * content area, team accent) around the timeline screens. No sign-in of its own.
 */
export default function ChroniclesLayout() {
  const { pathname } = useLocation();
  const atRoot = pathname === "/chronicles" || pathname === "/chronicles/";
  return (
    <main
      className="flex-1 overflow-y-auto bg-slate-50"
      style={{
        backgroundImage:
          "radial-gradient(60rem 18rem at 50% -6rem, var(--color-team-soft), transparent)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex items-center gap-1.5 text-sm text-slate-500"
        >
          <Link to="/" className="transition hover:text-slate-800">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          {atRoot ? (
            <span className="font-medium text-slate-800" aria-current="page">
              Chronicles
            </span>
          ) : (
            <Link to="/chronicles" className="transition hover:text-slate-800">
              Chronicles
            </Link>
          )}
        </nav>
        <Outlet />
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
