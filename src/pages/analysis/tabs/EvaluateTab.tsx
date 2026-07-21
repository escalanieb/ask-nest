/**
 * Evaluate Tab — Social Media Analysis and Evaluation
 * Per-post scoring: reach, sentiment, impact rating.
 * No functions yet — shell only.
 */

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "text-emerald-600 bg-emerald-50 border-emerald-200",
  neutral: "text-slate-500 bg-slate-100 border-slate-200",
  negative: "text-red-600 bg-red-50 border-red-200",
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

const PLACEHOLDER_POSTS = [
  {
    id: 1,
    platform: "Facebook",
    preview: "New infrastructure projects announced for Taguig City...",
    reach: 4200,
    sentiment: "positive",
    sentimentScore: 78,
    impact: 62,
    engagement: 340,
  },
  {
    id: 2,
    platform: "X (Twitter)",
    preview: "Rally scheduled this Saturday — residents urged to join...",
    reach: 1850,
    sentiment: "neutral",
    sentimentScore: 50,
    impact: 41,
    engagement: 95,
  },
];

export default function EvaluateTab() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Post Evaluation
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:outline-none">
            <option>All Platforms</option>
            <option>Facebook</option>
            <option>X (Twitter)</option>
            <option>YouTube</option>
          </select>
          <select className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:outline-none">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>All time</option>
          </select>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="flex shrink-0 items-center gap-px border-b border-slate-200 bg-white">
        {[
          { label: "Total Posts", value: "—" },
          { label: "Avg. Reach", value: "—" },
          { label: "Avg. Sentiment", value: "—" },
          { label: "Flagged", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-1 flex-col items-center py-3 px-4">
            <span className="text-lg font-bold text-slate-800">{stat.value}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Post evaluation cards */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          {PLACEHOLDER_POSTS.map((post) => (
            <div key={post.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {post.platform}
                  </span>
                  <p className="mt-0.5 text-sm text-slate-700 line-clamp-2">{post.preview}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${SENTIMENT_COLORS[post.sentiment]}`}
                >
                  {post.sentiment}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Reach</span>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                      {post.reach.toLocaleString()}
                    </span>
                  </div>
                  <ScoreBar
                    value={Math.min((post.reach / 5000) * 100, 100)}
                    color="bg-indigo-400"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Sentiment</span>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                      {post.sentimentScore}%
                    </span>
                  </div>
                  <ScoreBar value={post.sentimentScore} color="bg-emerald-400" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Impact</span>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                      {post.impact}%
                    </span>
                  </div>
                  <ScoreBar value={post.impact} color="bg-amber-400" />
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          <p className="mt-4 text-center text-xs text-slate-300">
            Connect a platform to populate real evaluation data.
          </p>
        </div>
      </div>
    </div>
  );
}
