/**
 * Comments Tab — View and engage with comment threads.
 * No functions yet — shell only.
 */

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-slate-300",
  negative: "bg-red-400",
};

const PLACEHOLDER_THREADS = [
  {
    id: 1,
    post: "New infrastructure projects announced...",
    platform: "Facebook",
    comments: [
      {
        id: 1,
        author: "Maria Santos",
        text: "Great news! Looking forward to the improvements.",
        sentiment: "positive",
        time: "1h ago",
      },
      {
        id: 2,
        author: "Juan Cruz",
        text: "When will construction begin?",
        sentiment: "neutral",
        time: "45m ago",
      },
      {
        id: 3,
        author: "Ana Reyes",
        text: "Hope this isn't just another empty promise.",
        sentiment: "negative",
        time: "30m ago",
      },
    ],
  },
];

export default function CommentsTab() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Thread list (left) */}
      <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Comment Threads
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {PLACEHOLDER_THREADS.map((thread) => (
            <button
              key={thread.id}
              className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                {thread.post}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {thread.platform}
                </span>
                <span className="text-[10px] text-slate-400">
                  · {thread.comments.length} comments
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Comment thread (right) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Thread header */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
          <p className="text-xs font-semibold text-slate-700">
            {PLACEHOLDER_THREADS[0].post}
          </p>
          <span className="text-[10px] text-slate-400">
            Facebook · 3 comments
          </span>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            {PLACEHOLDER_THREADS[0].comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
                    {comment.author[0]}
                  </div>
                  <span className="flex-1 text-xs font-semibold text-slate-700">
                    {comment.author}
                  </span>
                  <div
                    className={`h-2 w-2 rounded-full ${SENTIMENT_DOT[comment.sentiment]}`}
                    title={comment.sentiment}
                  />
                  <span className="text-[10px] text-slate-400">
                    {comment.time}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{comment.text}</p>
                <div className="mt-2 flex gap-2">
                  <button className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors">
                    Reply
                  </button>
                  <button className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply composer */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-4">
          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              placeholder="Write a reply..."
              className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
            />
            <button className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
