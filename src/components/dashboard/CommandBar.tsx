import { canManageDatasets } from "../../lib/datasetPermissions";
import { Link } from "react-router-dom";
import { useTrayStore, type TrayTab } from "../../stores/useTrayStore";
import { useActiveTrayTab } from "../../hooks/useActiveTrayTab";
import { useAuthStore } from "../../stores/useAuthStore";
import NestLogo from "../NestLogo";

const TOOLS: { tab: TrayTab; label: string; capability?: string }[] = [
  { tab: "news", label: "News", capability: "rss.use" },
  { tab: "video", label: "Video" },
  { tab: "disasters", label: "Disasters" },
];

export default function CommandBar() {
  const setTab = useTrayStore((s) => s.setTab);
  const activeTab = useActiveTrayTab();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 shadow-sm">
      {/* Brand */}
      <div className="flex shrink-0 items-center">
        <NestLogo width={88} className="p-2" />
      </div>

      <div className="flex-1" />

      <div className="mx-1 h-6 w-px bg-slate-200" />

      <nav aria-label="Tools" className="flex shrink-0 items-center gap-1">
        {TOOLS.filter((t) => !t.capability || user?.capabilities?.includes(t.capability)).map(
          (t) => (
            <button
              key={t.tab}
              type="button"
              aria-pressed={activeTab === t.tab}
              onClick={() => setTab(t.tab)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === t.tab ? "bg-team-soft text-team" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ),
        )}
      </nav>

      <div className="mx-1 h-6 w-px bg-slate-200" />

      {canManageDatasets(user) && (
        <Link
          to="/datasets"
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Datasets
        </Link>
      )}
      {canManageDatasets(user) && (
        <Link
          to="/datasets/import"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-team px-4 py-2 text-sm font-semibold text-team-foreground shadow-sm"
        >
          <span aria-hidden="true">↑</span> Import dataset
        </Link>
      )}
      <div className="mx-1 h-6 w-px bg-slate-200" />

      {/* User badge */}
      {user && (
        <div
          className="flex min-w-0 items-center gap-1.5 rounded-lg border border-team bg-team-soft px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-team"
          title={`${user.name} · ${user.team?.name ?? "Team unavailable"}`}
        >
          <svg
            className="h-3 w-3 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="truncate">
            {user.name} · {user.team?.name ?? "Team unavailable"}
          </span>
        </div>
      )}
    </header>
  );
}
