/**
 * Posts Tab — Social media post feed from connected accounts.
 * No functions yet — shell only.
 */

const PLATFORM_BADGE: Record<string, string> = {
  Facebook: "bg-blue-100 text-blue-700",
  "X (Twitter)": "bg-slate-800 text-white",
  Instagram: "bg-pink-100 text-pink-700",
  YouTube: "bg-red-100 text-red-700",
};

const PLACEHOLDER_POSTS = [
  {
    id: 1,
    platform: "Facebook",
    author: "CommsDash Official",
    time: "2 hours ago",
    content:
      "We are pleased to announce new community programs launching this month across all barangays in the district.",
    likes: 142,
    comments: 18,
    shares: 34,
  },
  {
    id: 2,
    platform: "X (Twitter)",
    author: "@CommsDash",
    time: "5 hours ago",
    content:
      "Press briefing scheduled for Monday 9AM. Follow for live updates. #CommsDash #PublicService",
    likes: 67,
    comments: 5,
    shares: 12,
  },
];

export default function PostsTab() {
  return (
    <div className="flex h-full flex-col">
      {/* Filter strip */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Filter:
        </span>
        {["All", "Facebook", "X (Twitter)", "Instagram", "YouTube"].map((f) => (
          <button
            key={f}
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 hover:border-red-400 hover:text-red-600 transition-colors first:border-red-400 first:text-red-600"
          >
            {f}
          </button>
        ))}
        <div className="ml-auto">
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Post feed */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          {PLACEHOLDER_POSTS.map((post) => (
            <div key={post.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                  {post.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{post.author}</p>
                  <p className="text-[10px] text-slate-400">{post.time}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PLATFORM_BADGE[post.platform] ?? "bg-slate-100 text-slate-600"}`}
                >
                  {post.platform}
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{post.content}</p>

              <div className="mt-3 flex items-center gap-5 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 01-1.341 5.974C17.153 16.323 16.072 17 14.9 17H8.731c-.526 0-1.04-.2-1.414-.575L5 14.146V8.96l3.239-3.602A2 2 0 009.5 4.003L11 3z" />
                  </svg>
                  {post.likes}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.58-3.58A19.848 19.848 0 0019 10.794V5.426c0-1.413-.993-2.67-2.43-2.902A19.874 19.874 0 0010 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {post.comments}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
                  </svg>
                  {post.shares}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:border-red-400 hover:text-red-600 transition-colors">
                    View Comments
                  </button>
                </div>
              </div>
            </div>
          ))}

          <p className="mt-2 text-center text-xs text-slate-300">
            Connect a platform account to load real posts.
          </p>
        </div>
      </div>
    </div>
  );
}
