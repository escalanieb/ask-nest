/**
 * Monitor Tab — Social Media Monitoring Feed
 * Displays a feed of tracked posts across connected platforms.
 * No functions yet — shell only.
 */
export default function MonitorTab() {
  const mockPlatforms = ["Facebook", "X (Twitter)", "Instagram", "YouTube"];

  return (
    <div className="flex h-full flex-col">
      {/* Platform filter strip */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Platforms:
        </span>
        {mockPlatforms.map((p) => (
          <button
            key={p}
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 hover:border-red-400 hover:text-red-600 transition-colors"
          >
            {p}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Last synced: —</span>
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors">
            Sync Now
          </button>
        </div>
      </div>

      {/* Feed area — placeholder cards */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mb-3 h-10 w-10 opacity-40"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm font-medium">No monitored posts yet</p>
            <p className="mt-1 text-xs text-slate-300">
              Connect a platform account to start monitoring posts.
            </p>
            <button className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
              Connect Platform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
