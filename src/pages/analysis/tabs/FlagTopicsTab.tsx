/**
 * Flag Topics Tab — Keyword/phrase flagging rules
 * Allows creating rules that flag posts matching keywords with severity levels.
 * No functions yet — shell only.
 */
const SEVERITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const PLACEHOLDER_RULES = [
  { id: 1, keyword: "rally", severity: "high", matches: 0 },
  { id: 2, keyword: "press release", severity: "medium", matches: 0 },
  { id: 3, keyword: "barangay", severity: "low", matches: 0 },
];

export default function FlagTopicsTab() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Flag Rules
        </span>
        <div className="ml-auto">
          <button className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 transition-colors">
            + Add Rule
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-3 grid grid-cols-[1fr_120px_90px_80px_48px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Keyword / Phrase</span>
          <span>Severity</span>
          <span>Scope</span>
          <span>Matches</span>
          <span />
        </div>

        <div className="flex flex-col gap-2">
          {PLACEHOLDER_RULES.map((rule) => (
            <div
              key={rule.id}
              className="grid grid-cols-[1fr_120px_90px_80px_48px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
            >
              <span className="text-sm font-medium text-slate-700">"{rule.keyword}"</span>
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${SEVERITY_COLORS[rule.severity]}`}
              >
                {rule.severity}
              </span>
              <span className="text-xs text-slate-400">All platforms</span>
              <span className="text-xs tabular-nums text-slate-500">{rule.matches} posts</span>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Empty hint */}
        <p className="mt-6 text-center text-xs text-slate-300">
          Rules will automatically flag matching posts when platform sync is active.
        </p>
      </div>
    </div>
  );
}
