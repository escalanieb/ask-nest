import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeAppUrl } from "../../lib/appRegistry";
import { rssErrorMessage } from "../../lib/rssReader";
import { useRssFeedMutations } from "../../hooks/useRssFeeds";
import type { RssFeed } from "../../services/api/rssFeedApi";

// Mirrors the backend validation in RssFeedController.
const NAME_MAX = 120;
const URL_MAX = 500;
const CATEGORY_MAX = 80;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding. */
  feed?: RssFeed;
  onSaved?: (feed: RssFeed) => void;
}

export default function RssFeedFormDialog({ open, onOpenChange, feed, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <FeedForm
          key={feed?.id ?? "new"}
          feed={feed}
          onDone={(saved) => {
            if (saved) onSaved?.(saved);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function FeedForm({ feed, onDone }: { feed?: RssFeed; onDone: (saved?: RssFeed) => void }) {
  const { create, update } = useRssFeedMutations();
  const [name, setName] = useState(feed?.name ?? "");
  const [url, setUrl] = useState(feed?.url ?? "");
  const [category, setCategory] = useState(feed?.category ?? "General");
  const [active, setActive] = useState(feed?.active ?? true);
  const [error, setError] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanUrl = normalizeAppUrl(url);
    const cleanCategory = category.trim() || "General";
    if (!cleanName) return setError("Enter a name for the feed.");
    if (!cleanUrl || cleanUrl.length > URL_MAX)
      return setError("Enter a valid feed link that starts with http:// or https://.");
    setError("");
    const input = { name: cleanName, url: cleanUrl, category: cleanCategory, active };
    const request = feed
      ? update.mutateAsync({ id: feed.id, ...input })
      : create.mutateAsync(input);
    request.then(onDone, (e: unknown) => setError(rssErrorMessage(e)));
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{feed ? "Edit feed" : "Add feed"}</DialogTitle>
        <DialogDescription>
          Paste the RSS or Atom link of a news source. Everyone on your team will see it here and on
          the Map.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="rss-name">Name</Label>
        <Input
          id="rss-name"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rappler — Nation"
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rss-url">Feed link</Label>
        <Input
          id="rss-url"
          value={url}
          maxLength={URL_MAX}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.org/feed"
          inputMode="url"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rss-category">Category</Label>
        <Input
          id="rss-category"
          value={category}
          maxLength={CATEGORY_MAX}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="General"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-team)]"
        />
        Active — fetch new articles from this feed
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : feed ? "Save" : "Add feed"}
        </Button>
      </DialogFooter>
    </form>
  );
}
