import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore } from "../../stores/useMapStore";
import { useAuthStore } from "../../stores/useAuthStore";
import NestLogo from "../NestLogo";

export default function CommandBar() {
  const resetFilters = useFilterStore((s) => s.resetFilters);
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 shadow-sm">
      {/* Brand */}
      <div className="flex shrink-0 items-center">
        <NestLogo width={88} className="p-2" />
      </div>

      <div className="flex-1" />

      {/* Selected location breadcrumb */}
      {selectedLocation && (
        <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
          <span className="max-w-[160px] truncate text-xs font-medium text-red-700">
            {selectedLocation.name}
          </span>
          <button
            onClick={() => useMapStore.getState().setSelectedLocation(null)}
            className="ml-1 shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="mx-1 h-6 w-px bg-slate-200" />

      {/* Reset */}
      <button
        onClick={resetFilters}
        title="Reset all filters"
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Reset
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200" />

      {/* User badge */}
      {user && (
        <div
          className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${
            user.role === "admin"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          <svg
            className="h-3 w-3"
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
          {user.name} · {user.role}
        </div>
      )}
    </header>
  );
}
