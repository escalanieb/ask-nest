import { useEffect, useState, lazy, Suspense } from "react";
import nestLogo from "./assets/nest-logo.svg";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import AppLoader from "./components/AppLoader";
import AppShell from "./components/layout/AppShell";
import { useAuthStore } from "./stores/useAuthStore";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const TalaCallbackPage = lazy(() => import("./pages/TalaCallbackPage"));
const DatasetListPage = lazy(() => import("./pages/datasets/DatasetListPage"));
const DatasetFormPage = lazy(() => import("./pages/datasets/DatasetFormPage"));
const DatasetUploadPage = lazy(
  () => import("./pages/datasets/DatasetUploadPage"),
);
const DatasetRecordsPage = lazy(
  () => import("./pages/datasets/DatasetRecordsPage"),
);

const BOOT_MS = 1800;

// Guard: redirect to / if not admin (used nested inside AppShell)
function RequireAdmin() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  return isAdmin() ? <Outlet /> : <Navigate to="/" replace />;
}

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center text-slate-400 text-sm">
      Loading…
    </div>
  );
}

function SmallScreenGuard() {
  const [small, setSmall] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setSmall(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!small) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 px-8 text-center">
      {/* Logo with pulse animation (ease-in-out) */}
      <div className="animate-pulse mb-8">
        <div className="bg-white rounded-2xl px-8 py-5 shadow-xl">
          <img src={nestLogo} alt="NEST Logo" className="h-14 w-auto" />
        </div>
      </div>

      <p className="text-white text-base font-semibold leading-relaxed max-w-xs">
        Please switch to a larger display size (larger tablet, laptop, or
        Computer)
      </p>
      <p className="mt-3 text-slate-400 text-xs font-medium tracking-wide">
        — NEST IT Team
      </p>
    </div>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  if (booting) return <AppLoader />;

  return (
    <>
      <SmallScreenGuard />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={token ? <Navigate to="/" replace /> : <Login />}
            />
            <Route path="/auth/tala/callback" element={<TalaCallbackPage />} />

            {/* Authenticated — AppShell provides sidebar + auth guard */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              {/* Dataset admin — admin only */}
              <Route element={<RequireAdmin />}>
                <Route path="/datasets" element={<DatasetListPage />} />
                <Route path="/datasets/new" element={<DatasetFormPage />} />
                <Route
                  path="/datasets/:id/edit"
                  element={<DatasetFormPage />}
                />
                <Route
                  path="/datasets/:id/upload"
                  element={<DatasetUploadPage />}
                />
              </Route>

              {/* Records — any authenticated user */}
              <Route
                path="/datasets/:id/records"
                element={<DatasetRecordsPage />}
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}
