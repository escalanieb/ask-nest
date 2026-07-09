import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";
import NestLogo from "../NestLogo";
import AppsMenu from "./AppsMenu";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  end?: boolean;
}

const MapIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

const DatasetIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Map Dashboard", icon: <MapIcon />, end: true },
  {
    to: "/datasets",
    label: "Datasets",
    icon: <DatasetIcon />,
    adminOnly: true,
  },
];

export default function AppSidebar() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const visible = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin());

  return (
    <nav className="flex h-screen w-14 shrink-0 flex-col items-center border-r border-slate-800 bg-slate-900 py-3 z-50">
      {/* Logo */}
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
        <NestLogo width={28} />
      </div>

      <div className="my-2 h-px w-8 bg-slate-700" />

      {/* Nav items */}
      <div className="flex flex-1 flex-col items-center gap-1 pt-1">
        {visible.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={[
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-red-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              {item.icon}
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-[9999]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
        {/* Apps launcher */}
        <AppsMenu />
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        title="Logout"
        className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-400"
      >
        <LogoutIcon />
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-[9999]">
          Logout
        </span>
      </button>
    </nav>
  );
}
