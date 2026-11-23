import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Archive,
  ArrowUpRight,
  Copy,
  List,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useChroniclesMutations, useTimelines } from "../../hooks/useChronicles";
import { publicUrl } from "../../services/chroniclesApi";
import type { ChroniclesTimeline } from "../../types/chronicles";
import {
  Field,
  FormError,
  PageHeader,
  StateBadge,
  TimelineCardsSkeleton,
  panelClass,
} from "../../components/chronicles/parts";

export default function TimelinesPage() {
  const timelines = useTimelines();
  const { setArchived, clone } = useChroniclesMutations();
  const [cloning, setCloning] = useState<ChroniclesTimeline | null>(null);
  const [archiving, setArchiving] = useState<ChroniclesTimeline | null>(null);
  const [cloneError, setCloneError] = useState("");
  const busy = setArchived.isPending || clone.isPending;
  const list = timelines.data ?? [];

  async function toggleArchive(t: ChroniclesTimeline) {
    const archive = t.status !== "archived";
    try {
      await setArchived.mutateAsync({ id: t.id, archived: archive });
      toast.success(archive ? `Archived "${t.name}"` : `Restored "${t.name}" to draft`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setArchiving(null);
    }
  }

  async function submitClone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cloning) return;
    const form = new FormData(event.currentTarget);
    setCloneError("");
    try {
      await clone.mutateAsync({
        id: cloning.id,
        name: String(form.get("name")),
        slug: String(form.get("slug")),
        withEntries: form.get("withEntries") === "on",
      });
      toast.success(`Created a draft copy of "${cloning.name}"`);
      setCloning(null);
    } catch (err) {
      setCloneError((err as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        title="Chronicles"
        subtitle={
          timelines.isLoading
            ? "Loading your timelines…"
            : `${list.length} ${list.length === 1 ? "timeline" : "timelines"} · Manage entries, branding and publishing.`
        }
        actions={
          <Link to="/chronicles/new" className={buttonVariants({ className: "h-9" })}>
            <Plus /> New timeline
          </Link>
        }
      />
      <FormError>{timelines.error ? (timelines.error as Error).message : ""}</FormError>

      {timelines.isLoading ? (
        <TimelineCardsSkeleton />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
          {list.map((t) => (
            <div key={t.id} className={cn(panelClass, "flex flex-col")}>
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between gap-3">
                  <StateBadge value={t.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={busy}
                      render={
                        <Button
                          variant="ghost"
                          className="size-8"
                          aria-label={`Actions for ${t.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
                      <DropdownMenuItem
                        className="min-h-9"
                        render={<Link to={`/chronicles/timelines/${t.id}/settings`} />}
                      >
                        <Settings /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-9"
                        onClick={() => {
                          setCloneError("");
                          setCloning(t);
                        }}
                      >
                        <Copy /> Clone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="min-h-9"
                        variant={t.status === "archived" ? "default" : "destructive"}
                        onClick={() =>
                          t.status === "archived" ? void toggleArchive(t) : setArchiving(t)
                        }
                      >
                        {t.status === "archived" ? <RotateCcw /> : <Archive />}
                        {t.status === "archived" ? "Restore to draft" : "Archive"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-900">{t.name}</h2>
                {t.status === "published" ? (
                  <a
                    href={publicUrl(t.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-sm text-team hover:underline"
                  >
                    {t.slug}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                ) : (
                  <span className="mt-0.5 block text-sm text-slate-400">{t.slug}</span>
                )}
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                  {t.description || "No description yet."}
                </p>
                <span className="mt-3 block text-xs text-slate-400">
                  Updated{" "}
                  {new Date(t.entries_max_updated_at || t.updated_at || "").toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <List className="size-4" />
                  {t.entries_count ?? 0} entries
                </span>
                <Link
                  to={`/chronicles/timelines/${t.id}/entries`}
                  className={buttonVariants({ variant: "outline", className: "h-9" })}
                >
                  Manage entries
                  <ArrowUpRight />
                </Link>
              </div>
            </div>
          ))}
          {!list.length && !timelines.error && (
            <Empty className="col-span-full border">
              <EmptyHeader>
                <EmptyTitle>No timelines yet</EmptyTitle>
                <EmptyDescription>
                  Add a timeline, then enter events or import an Excel workbook.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      )}

      <Dialog
        open={!!cloning}
        onOpenChange={(open) => {
          if (!open && !clone.isPending) setCloning(null);
        }}
      >
        <DialogContent showCloseButton={!clone.isPending} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clone timeline</DialogTitle>
            <DialogDescription>Create a draft copy of {cloning?.name}.</DialogDescription>
          </DialogHeader>
          {cloning && (
            <form className="flex flex-col gap-4" onSubmit={submitClone}>
              <FormError>{cloneError}</FormError>
              <Field label="Name">
                <Input name="name" required maxLength={255} defaultValue={`${cloning.name} copy`} />
              </Field>
              <Field label="New slug">
                <Input
                  name="slug"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="withEntries" />
                Include entries and uploaded images
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={clone.isPending}
                  onClick={() => setCloning(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={clone.isPending}>
                  {clone.isPending && <Spinner aria-label="Cloning timeline" />}
                  Create draft copy
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!archiving}
        onOpenChange={(open) => {
          if (!open && !setArchived.isPending) setArchiving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive “{archiving?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its public page goes offline. You can restore it to draft later from this menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setArchived.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={setArchived.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (archiving) void toggleArchive(archiving);
              }}
            >
              {setArchived.isPending && <Spinner aria-label="Archiving timeline" />} Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
