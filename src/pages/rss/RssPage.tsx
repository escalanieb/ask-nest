import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RssFeedFormDialog from "../../components/rss/RssFeedFormDialog";
import { useAuthStore } from "../../stores/useAuthStore";
import { useRssFeedMutations, useRssFeeds, useRssItems } from "../../hooks/useRssFeeds";
import { isSafeHref } from "../../lib/appRegistry";
import {
  filterItems,
  mergeFeedItems,
  rssErrorMessage,
  timeAgo,
  type ReaderItem,
} from "../../lib/rssReader";
import type { RssFeed, RssFetchResult } from "../../services/api/rssFeedApi";

const PAGE_SIZE = 30;

export default function RssPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const feedsQuery = useRssFeeds();
  const feeds = useMemo(() => feedsQuery.data ?? [], [feedsQuery.data]);
  const { update, remove } = useRssFeedMutations();

  // The selected feed lives in the URL (?feed=12) so a view can be shared or reloaded.
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("feed"));
  const selected = feeds.find((feed) => feed.id === requested) ?? null;
  const select = (feed: RssFeed | null) => {
    setParams(feed ? { feed: String(feed.id) } : {}, { replace: true });
    setVisible(PAGE_SIZE);
  };

  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RssFeed | undefined>();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<RssFeed | null>(null);
  const [actionError, setActionError] = useState("");

  const activeFeeds = feeds.filter((feed) => feed.active);
  const fetchIds = selected ? (selected.active ? [selected.id] : []) : activeFeeds.map((f) => f.id);
  const itemQueries = useRssItems(fetchIds);

  const loaded = itemQueries.flatMap((q) => (q.data ? [q.data as RssFetchResult] : []));
  const items = filterItems(mergeFeedItems(loaded), query);
  const loading = itemQueries.some((q) => q.isLoading);
  const fetching = itemQueries.some((q) => q.isFetching);
  const failed = fetchIds.filter((_, i) => itemQueries[i]?.isError);
  const failedNames = failed.map((id) => feeds.find((f) => f.id === id)?.name ?? `Feed ${id}`);
  const newest = Math.max(0, ...itemQueries.map((q) => q.dataUpdatedAt));

  const openForm = (feed?: RssFeed) => {
    setEditing(feed);
    setFormOpen(true);
    setMenuFor(null);
  };

  const togglePaused = (feed: RssFeed) => {
    setMenuFor(null);
    setActionError("");
    update.mutate(
      { id: feed.id, active: !feed.active },
      { onError: (e) => setActionError(rssErrorMessage(e)) },
    );
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">RSS Feeds</h1>
          <p className="text-sm text-slate-500">Latest articles from your team's news sources.</p>
        </div>
        {isAdmin && <Button onClick={() => openForm()}>+ Add feed</Button>}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Feed list */}
        <aside
          aria-label="Feeds"
          className="flex w-72 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-slate-200 bg-white p-3"
        >
          <FeedButton
            label="All feeds"
            detail={`${activeFeeds.length} active`}
            selected={!selected}
            onClick={() => select(null)}
          />
          <div className="my-2 h-px bg-slate-100" aria-hidden="true" />

          {feedsQuery.isLoading && <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>}
          {feedsQuery.isError && (
            <p role="alert" className="px-3 py-2 text-sm text-red-700">
              {rssErrorMessage(feedsQuery.error)}
            </p>
          )}

          {/* grid-cols-1 is minmax(0, 1fr): long names can't stretch the list past the sidebar. */}
          <ul className="grid min-w-0 grid-cols-1 gap-0.5">
            {feeds.map((feed) => (
              <li key={feed.id} className="relative min-w-0">
                <FeedButton
                  label={feed.name}
                  detail={[
                    feed.active ? feed.category : "Paused",
                    // Admins see why some feeds have no ⋯ menu: another team owns them.
                    isAdmin && !feed.can_manage ? "Shared · view only" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  muted={!feed.active}
                  selected={selected?.id === feed.id}
                  onClick={() => select(feed)}
                  padRight={feed.can_manage}
                />
                {feed.can_manage && (
                  <>
                    <button
                      type="button"
                      aria-label={`Manage ${feed.name}`}
                      title="Edit, pause or delete"
                      aria-haspopup="menu"
                      aria-expanded={menuFor === feed.id}
                      onClick={() => setMenuFor(menuFor === feed.id ? null : feed.id)}
                      className="absolute right-1.5 top-2 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                    >
                      <span aria-hidden="true">⋯</span>
                    </button>
                    {menuFor === feed.id && (
                      <>
                        <button
                          type="button"
                          aria-label="Close menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setMenuFor(null)}
                        />
                        <div
                          role="menu"
                          className="absolute right-1.5 top-full z-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                        >
                          <MenuItem onClick={() => openForm(feed)}>Edit</MenuItem>
                          <MenuItem onClick={() => togglePaused(feed)}>
                            {feed.active ? "Pause" : "Resume"}
                          </MenuItem>
                          <MenuItem
                            danger
                            onClick={() => {
                              setMenuFor(null);
                              setActionError("");
                              setDeleting(feed);
                            }}
                          >
                            Delete
                          </MenuItem>
                        </div>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>

          {actionError && (
            <p role="alert" className="mt-3 px-3 text-sm text-red-700">
              {actionError}
            </p>
          )}
        </aside>

        {/* Articles */}
        <section aria-label="Articles" className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/70 px-6 py-3">
            <Input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Search articles"
              aria-label="Search articles"
              className="max-w-sm"
            />
            <span className="text-sm text-slate-500">
              {loading ? "Loading…" : `${items.length} article${items.length === 1 ? "" : "s"}`}
            </span>
            <span className="ml-auto text-xs text-slate-400">
              {newest > 0 && `Updated ${timeAgo(new Date(newest).toISOString())}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={fetchIds.length === 0 || fetching}
              onClick={() => itemQueries.forEach((q) => void q.refetch())}
            >
              {fetching ? "Refreshing…" : "↻ Refresh"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto grid max-w-3xl gap-3">
              {failedNames.length > 0 && (
                <p
                  role="alert"
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  Couldn't load {failedNames.join(", ")}. Try refreshing later.
                </p>
              )}

              <EmptyState
                hasFeeds={feeds.length > 0}
                feedsLoading={feedsQuery.isLoading}
                selected={selected}
                activeCount={activeFeeds.length}
                loading={loading}
                itemCount={items.length}
                searching={query.trim() !== ""}
                isAdmin={isAdmin}
                onAdd={() => openForm()}
              />

              {items.slice(0, visible).map((item) => (
                <ArticleCard key={item.link} item={item} showSource={!selected} />
              ))}

              {items.length > visible && (
                <Button
                  variant="outline"
                  className="mx-auto mt-2"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Show more
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <RssFeedFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        feed={editing}
        onSaved={(saved) => !editing && select(saved)}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The feed will be removed for your whole team, here and on the Map. You can pause it
              instead if you may need it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && deleting && (
            <p role="alert" className="text-sm text-red-700">
              {actionError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                // Keep the dialog open until the request settles.
                event.preventDefault();
                if (!deleting) return;
                const target = deleting;
                remove.mutateAsync(target.id).then(
                  () => {
                    if (selected?.id === target.id) select(null);
                    setDeleting(null);
                  },
                  (e: unknown) => setActionError(rssErrorMessage(e)),
                );
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function FeedButton({
  label,
  detail,
  selected,
  muted,
  padRight,
  onClick,
}: {
  label: string;
  detail: string;
  selected: boolean;
  muted?: boolean;
  padRight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-current={selected ? "page" : undefined}
      className={[
        "block w-full min-w-0 rounded-lg px-3 py-2 text-left transition-colors",
        padRight ? "pr-10" : "",
        selected ? "bg-team-soft text-slate-900" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span
        className={`line-clamp-2 break-words text-sm font-medium leading-snug ${muted ? "text-slate-400" : ""}`}
      >
        {selected && (
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-team" aria-hidden="true" />
        )}
        {label}
      </span>
      <span className="block truncate text-xs text-slate-400">{detail}</span>
    </button>
  );
}

function MenuItem({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left ${danger ? "text-red-700 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function EmptyState(props: {
  hasFeeds: boolean;
  feedsLoading: boolean;
  selected: RssFeed | null;
  activeCount: number;
  loading: boolean;
  itemCount: number;
  searching: boolean;
  isAdmin: boolean;
  onAdd: () => void;
}) {
  let message: React.ReactNode;
  if (props.feedsLoading || props.loading || props.itemCount > 0) return null;
  if (!props.hasFeeds)
    message = props.isAdmin ? (
      <>
        No feeds yet.{" "}
        <button type="button" onClick={props.onAdd} className="font-medium text-team underline">
          Add your first feed
        </button>
        .
      </>
    ) : (
      "No feeds yet. Ask an admin to add one."
    );
  else if (props.selected && !props.selected.active)
    message = `${props.selected.name} is paused, so no new articles are fetched.`;
  else if (!props.selected && props.activeCount === 0) message = "All feeds are paused.";
  else if (props.searching) message = "No articles match your search.";
  else message = "No articles found.";

  return <p className="py-16 text-center text-sm text-slate-500">{message}</p>;
}

function ArticleCard({ item, showSource }: { item: ReaderItem; showSource: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  // Feed content is external: only ever render http(s) links and images.
  const href = isSafeHref(item.link) ? item.link : undefined;
  const image = item.image && isSafeHref(item.image) && !imageFailed ? item.image : null;
  const meta = [showSource ? item.feedName : null, timeAgo(item.published)].filter(Boolean);

  const copy = () => {
    if (!href) return;
    void navigator.clipboard.writeText(href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <article className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-team hover:shadow-md">
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="h-20 w-28 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        {meta.length > 0 && <p className="text-xs text-slate-400">{meta.join(" · ")}</p>}
        <h2 className="mt-0.5 text-[15px] font-semibold leading-snug text-slate-800">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-team-strong focus-visible:outline-none"
            >
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h2>
        {item.summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.summary}</p>
        )}
      </div>
      {href && (
        <button
          type="button"
          onClick={copy}
          className="relative z-10 self-start rounded-md px-2 py-1 text-xs font-medium text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 group-hover:opacity-100"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      )}
    </article>
  );
}
