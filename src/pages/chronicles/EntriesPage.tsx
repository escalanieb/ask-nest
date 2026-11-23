import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useChroniclesMutations, useEntries, useTimeline } from "../../hooks/useChronicles";
import type { ChroniclesEntry } from "../../types/chronicles";
import EntryForm from "../../components/chronicles/EntryForm";
import EntryThumbnail from "../../components/chronicles/EntryThumbnail";
import PublishButton from "../../components/chronicles/PublishButton";
import {
  FormError,
  PageHeader,
  StateBadge,
  TimelineTabs,
  panelClass,
  selectClass,
} from "../../components/chronicles/parts";

export default function EntriesPage() {
  const { id = "" } = useParams();
  const timeline = useTimeline(id);
  const { deleteEntry } = useChroniclesMutations();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [editing, setEditing] = useState<ChroniclesEntry | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<ChroniclesEntry | null>(null);

  const feed = useEntries(id, { page, search, issueCategory: category, status, severity });
  const config = timeline.data?.config;
  const loading = feed.isLoading || feed.isPlaceholderData;
  const filtered = !!(search || category || status || severity);
  const formOpen = editing !== undefined && !!timeline.data;

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      if (next === search) return;
      setSearch(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setStatus("");
    setSeverity("");
    setPage(1);
  }

  async function remove() {
    if (!deleting || deleteEntry.isPending) return;
    try {
      await deleteEntry.mutateAsync({ timelineId: id, entryId: deleting.id });
      toast.success("Entry deleted");
      setDeleting(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const error = (timeline.error ?? feed.error) as Error | null;

  return (
    <>
      <PageHeader
        eyebrow={timeline.data?.name}
        title="Entries"
        subtitle="Events shown on the public timeline and calendar."
        actions={
          <>
            <PublishButton timeline={timeline.data} disabled={loading || editing !== undefined} />
            <Button disabled={!timeline.data} onClick={() => setEditing(null)}>
              <Plus /> New entry
            </Button>
          </>
        }
      />
      <TimelineTabs id={id} />
      <FormError>{error?.message ?? ""}</FormError>

      <div className={cn(panelClass, "overflow-hidden")}>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3"
          role="search"
        >
          <div className="relative min-w-56 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              aria-label="Search entries"
              placeholder="Search title or summary"
              className={cn(selectClass, "pl-9")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {[
            [
              "Category",
              category,
              setCategory,
              "All categories",
              config?.categories.map((c) => [c.key, c.label]),
            ],
            ["Status", status, setStatus, "All statuses", config?.statuses.map((s) => [s, s])],
            [
              "Severity",
              severity,
              setSeverity,
              "All severities",
              config?.severities.map((s) => [s, s]),
            ],
          ].map(([label, value, set, all, options]) => (
            <select
              key={label as string}
              aria-label={label as string}
              className={cn(selectClass, "w-auto")}
              value={value as string}
              onChange={(e) => {
                (set as (v: string) => void)(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{all as string}</option>
              {(options as string[][] | undefined)?.map(([key, text]) => (
                <option key={key} value={key}>
                  {text}
                </option>
              ))}
            </select>
          ))}
          {filtered && (
            <Button variant="ghost" onClick={clearFilters}>
              <X /> Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto" aria-busy={loading}>
          {loading && (
            <span className="sr-only" role="status">
              Fetching entries
            </span>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]">Image</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feed.isLoading
                ? Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={i} aria-hidden="true">
                      {Array.from({ length: 6 }, (_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full min-w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : feed.data?.data.map((entry) => {
                    const entryCategory = config?.categories.find(
                      (c) => c.key === entry.issueCategory,
                    );
                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(feed.isPlaceholderData && "opacity-60")}
                      >
                        <TableCell>
                          <EntryThumbnail
                            key={`${entry.id}:${entry.imageUrl || ""}`}
                            timelineId={id}
                            entryId={entry.id}
                            imageUrl={entry.imageUrl}
                            title={entry.title}
                          />
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal">
                          <span className="font-medium text-slate-900">{entry.title}</span>
                          <small className="line-clamp-1 block text-xs text-slate-500">
                            {entry.shortSummary}
                          </small>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {entry.date}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <span
                              aria-hidden="true"
                              className="size-2.5 rounded-sm"
                              style={{ background: entryCategory?.color }}
                            />
                            {entryCategory?.label || entry.issueCategory}
                          </span>
                        </TableCell>
                        <TableCell>{entry.status && <StateBadge value={entry.status} />}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${entry.title}`}
                              title="Edit"
                              onClick={() => setEditing(entry)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${entry.title}`}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleting(entry)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>

        {!loading && feed.data?.data.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {filtered ? "No entries match these filters" : "No entries yet"}
              </EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? "Try a different search or clear the filters."
                  : "Create the first entry or import an Excel workbook."}
              </EmptyDescription>
            </EmptyHeader>
            {filtered && (
              <EmptyContent>
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            {feed.data?.meta.total ?? 0} {feed.data?.meta.total === 1 ? "entry" : "entries"}
          </span>
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {feed.data?.meta.last_page ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || !feed.data || page >= feed.data.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent
          showCloseButton
          className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogHeader className="border-b border-slate-200 px-6 py-4">
            <DialogTitle className="text-base font-semibold">
              {editing ? "Edit entry" : "New entry"}
            </DialogTitle>
            <DialogDescription>
              Entries are sourced, neutral records shown on the public timeline.
            </DialogDescription>
          </DialogHeader>
          {formOpen && timeline.data && (
            <EntryForm
              key={editing?.id || "new"}
              timeline={timeline.data}
              entry={editing ?? null}
              onSaved={() => setEditing(undefined)}
              onCancel={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deleteEntry.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be permanently removed from the timeline. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteEntry.isPending}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleteEntry.isPending && <Spinner aria-label="Deleting entry" />} Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
