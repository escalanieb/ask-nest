/**
 * Compose Tab — Write and (eventually) publish social media posts.
 * No functions yet — shell only.
 */

const PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    color: "bg-blue-600",
    textColor: "text-blue-700",
    bgLight: "bg-blue-50",
    borderActive: "border-blue-500",
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    color: "bg-slate-900",
    textColor: "text-slate-700",
    bgLight: "bg-slate-100",
    borderActive: "border-slate-800",
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "bg-pink-600",
    textColor: "text-pink-700",
    bgLight: "bg-pink-50",
    borderActive: "border-pink-500",
  },
];

export default function ComposeTab() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Composer (left) */}
      <div className="flex w-[480px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            New Post
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {/* Platform selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">Post to</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 text-[11px] font-semibold transition-all ${p.bgLight} ${p.textColor} hover:border-current`}
                >
                  <span className={`h-2 w-2 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post body */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">Content</label>
            <textarea
              rows={6}
              placeholder="What would you like to post?"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[10px] text-slate-300">0 / 2200</span>
            </div>
          </div>

          {/* Media upload */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Media (optional)
            </label>
            <div className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 transition-colors hover:border-red-300 hover:text-red-400 cursor-pointer">
              + Add image or video
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Schedule (optional)
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 focus:border-red-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Save Draft
          </button>
          <button className="rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
            Publish Now
          </button>
        </div>
      </div>

      {/* Preview (right) */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Preview
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-200" />
              <div>
                <p className="text-xs font-semibold text-slate-700">CommsDash Official</p>
                <p className="text-[10px] text-slate-400">Just now</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 italic">Your post content will appear here…</p>
          </div>
        </div>

        {/* Drafts section */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Saved Drafts — 0
          </p>
          <p className="mt-1 text-[11px] text-slate-300">No drafts yet.</p>
        </div>
      </div>
    </div>
  );
}
