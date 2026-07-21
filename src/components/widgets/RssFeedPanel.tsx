import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { rssFeedApi } from "../../services/api/rssFeedApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function RssFeedPanel() {
  // All feed-selection state is local so each panel instance is independent
  const [activeFeedId, setActiveFeedId] = useState<number | null>(null);
  const [multipleMode, setMultipleMode] = useState(false);
  const [selectedFeedIds, setSelectedFeedIds] = useState<number[]>([]);

  const toggleFeedSelection = (id: number) =>
    setSelectedFeedIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );

  const [page, setPage] = useState(0);
  const [showMultiSelector, setShowMultiSelector] = useState(false);
  const [activeFeedTab, setActiveFeedTab] = useState(0);
  const PAGE_SIZE = 5;

  // Fetch all feeds list for dropdown/selector
  const { data: allFeeds = [] } = useQuery({
    queryKey: ["rss-feeds"],
    queryFn: () => rssFeedApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  // Single mode: fetch active feed
  const {
    data: singleFeedResult,
    isLoading: singleLoading,
    isError: singleError,
    refetch: refetchSingle,
  } = useQuery({
    queryKey: ["rss-items", activeFeedId],
    queryFn: () => rssFeedApi.fetch(activeFeedId!),
    enabled: !!activeFeedId && !multipleMode,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  // Multiple mode: fetch all selected feeds
  const {
    data: multiFeedsResults = [],
    isLoading: multiLoading,
    isError: multiError,
    refetch: refetchMulti,
  } = useQuery({
    queryKey: ["rss-items-multiple", selectedFeedIds],
    queryFn: async () => {
      if (selectedFeedIds.length === 0) return [];
      return Promise.all(selectedFeedIds.map((id) => rssFeedApi.fetch(id)));
    },
    enabled: multipleMode && selectedFeedIds.length > 0,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  // Render single mode
  if (!multipleMode) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-white">
        {/* Control bar: feed selector + toggle */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <select
            value={activeFeedId ?? ""}
            onChange={(e) => setActiveFeedId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 focus:outline-none"
          >
            <option value="">— Select a feed —</option>
            {allFeeds.map((feed) => (
              <option key={feed.id} value={feed.id}>
                {feed.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setMultipleMode(true);
              setShowMultiSelector(true);
              if (activeFeedId && !selectedFeedIds.includes(activeFeedId)) {
                toggleFeedSelection(activeFeedId);
              }
            }}
            title="View multiple feeds"
            className="rounded border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Multi
          </button>
          {singleFeedResult && (
            <button
              onClick={() => refetchSingle()}
              className="shrink-0 text-[9px] text-slate-400 transition-colors hover:text-red-500"
            >
              &#x21BB;
            </button>
          )}
        </div>

        {/* Single feed content */}
        {!activeFeedId ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Select a feed to start reading articles.
            </p>
          </div>
        ) : (
          <SingleFeedView
            result={singleFeedResult}
            isLoading={singleLoading}
            isError={singleError}
            page={page}
            setPage={setPage}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>
    );
  }

  // Render multiple mode
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Control bar: show selected feeds, manage selection */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase text-slate-400">
          {selectedFeedIds.length} feeds
        </span>
        <button
          onClick={() => setShowMultiSelector(!showMultiSelector)}
          className="rounded border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
        >
          {showMultiSelector ? "Hide" : "Manage"}
        </button>
        <button
          onClick={() => setMultipleMode(false)}
          className="ml-auto rounded border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
        >
          Single
        </button>
        {selectedFeedIds.length > 0 && (
          <button
            onClick={() => refetchMulti()}
            className="shrink-0 text-[9px] text-slate-400 transition-colors hover:text-red-500"
          >
            &#x21BB;
          </button>
        )}
      </div>

      {/* Feed selector modal/dropdown */}
      {showMultiSelector && (
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
          <div className="mb-2 text-[9px] font-semibold uppercase text-slate-400">Select feeds</div>
          <div className="flex flex-wrap gap-1">
            {allFeeds.map((feed) => (
              <button
                key={feed.id}
                onClick={() => toggleFeedSelection(feed.id)}
                className={[
                  "rounded px-2 py-1 text-[10px] font-semibold transition-colors border",
                  selectedFeedIds.includes(feed.id)
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                ].join(" ")}
              >
                {feed.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs for each feed or combined view */}
      {selectedFeedIds.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Select feeds above to view multiple sources.
          </p>
        </div>
      ) : (
        <>
          {/* Feed tabs */}
          <div className="flex shrink-0 items-center border-b border-slate-100 bg-slate-50 overflow-x-auto">
            {multiFeedsResults.map((result, idx) => (
              <button
                key={result.feed.id}
                onClick={() => setActiveFeedTab(idx)}
                className={[
                  "px-3 py-1.5 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap",
                  activeFeedTab === idx
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-400 hover:text-slate-600",
                ].join(" ")}
              >
                {result.feed.name}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <MultiFeedView
            results={multiFeedsResults}
            activeTabIdx={activeFeedTab}
            isLoading={multiLoading}
            isError={multiError}
            page={page}
            setPage={setPage}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single feed view component
// ---------------------------------------------------------------------------
interface SingleFeedViewProps {
  result?: any;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

function SingleFeedView({
  result,
  isLoading,
  isError,
  page,
  setPage,
  pageSize,
}: SingleFeedViewProps) {
  const allItems = result?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const items = allItems.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Source bar */}
      {result?.feed && (
        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
          <span className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {result.feed.name}
          </span>
        </div>
      )}

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            Fetching articles…
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-xs text-red-400">Failed to fetch articles.</p>
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            No articles found.
          </div>
        )}
        {items.map((item: any, i: number) => (
          <ArticleItem key={i} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {allItems.length > pageSize && (
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-1.5">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={safePage === 0}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-[9px] text-slate-400">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-feed view component (tabbed)
// ---------------------------------------------------------------------------
interface MultiFeedViewProps {
  results: any[];
  activeTabIdx: number;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
}

function MultiFeedView({
  results,
  activeTabIdx,
  isLoading,
  isError,
  page,
  setPage,
  pageSize,
}: MultiFeedViewProps) {
  const result = results[activeTabIdx];
  if (!result) return null;

  const allItems = result.items ?? [];
  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const items = allItems.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            Fetching articles…
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-xs text-red-400">Failed to fetch articles.</p>
          </div>
        )}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            No articles found.
          </div>
        )}
        {items.map((item: any, i: number) => (
          <ArticleItem key={i} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {allItems.length > pageSize && (
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-1.5">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={safePage === 0}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-[9px] text-slate-400">
            {safePage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={safePage === totalPages - 1}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared article item component
// ---------------------------------------------------------------------------
interface ArticleItemProps {
  item: any;
}

function ArticleItem({ item }: ArticleItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleCopyLink() {
    navigator.clipboard.writeText(item.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="relative border-b border-slate-100">
      {/* Article row — click opens the action menu */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="group w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-start gap-2">
          {item.image && (
            <img
              src={item.image}
              alt=""
              className="mt-0.5 h-10 w-10 shrink-0 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-800 transition-colors group-hover:text-red-700">
              {item.title}
            </p>
            {item.summary && (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                {item.summary}
              </p>
            )}
            <p className="mt-1 text-[9px] text-slate-400">{timeAgo(item.published)}</p>
          </div>
        </div>
      </button>

      {/* Action menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-3 right-3 z-10 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
          style={{ top: "calc(100% - 4px)" }}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              Actions
            </p>
          </div>

          {/* Visit Post */}
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Visit Post
          </a>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            {copied ? "Copied!" : "Copy Link"}
          </button>

          {/* ── Future actions go here ── */}

          {/* Dismiss */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-400 hover:bg-slate-50 transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
