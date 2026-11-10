import { useState } from "react";
import { Link } from "react-router-dom";
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
import { useAuthStore } from "../stores/useAuthStore";
import { isSafeHref, visibleBuiltIns } from "../lib/appRegistry";
import { AppTile } from "../components/layout/AppIcons";
import AppFormDialog from "../components/launcher/AppFormDialog";
import DevTeamSwitcher from "../components/dashboard/DevTeamSwitcher";
import { useTeamAppMutations, useTeamApps } from "../hooks/useTeamApps";
import { appsErrorMessage, type TeamApp } from "../services/api/appsApi";

const cardClass =
  "group relative flex h-full items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-team hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-team";

const gridClass = "grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

const ExternalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

function CardBody({
  label,
  description,
  external,
}: {
  label: string;
  description: string;
  external: boolean;
}) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-slate-500">
          {description}
        </span>
      </span>
      <span className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-team">
        {external ? <ExternalIcon /> : <ChevronIcon />}
      </span>
    </>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </div>
  );
}

export default function Launcher() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const builtIns = visibleBuiltIns(user);
  const apps = useTeamApps();
  const { remove } = useTeamAppMutations();
  const customApps = (apps.data ?? []).filter((app) => isSafeHref(app.url));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamApp | undefined>();
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<TeamApp | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const openForm = (app?: TeamApp) => {
    setEditing(app);
    setFormOpen(true);
    setMenuFor(null);
  };

  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <main
      className="flex-1 overflow-y-auto bg-slate-50"
      style={{
        backgroundImage:
          "radial-gradient(60rem 22rem at 50% -6rem, var(--color-team-soft), transparent)",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            {user?.team?.name && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-team" aria-hidden="true" />
                {user.team.name}
              </span>
            )}
            <DevTeamSwitcher />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1.5 text-slate-500">Choose a tool to get started.</p>
        </header>

        <section aria-label="Tools" className="mb-10">
          <SectionHeading title="Tools" />
          <ul className={gridClass}>
            {builtIns.map((app) => (
              <li key={app.id}>
                {app.internal ? (
                  <Link to={app.href} className={cardClass}>
                    <AppTile icon={app.icon} label={app.label} color={app.color} />
                    <CardBody label={app.label} description={app.description} external={false} />
                  </Link>
                ) : (
                  <a
                    href={app.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    <AppTile icon={app.icon} label={app.label} color={app.color} />
                    <CardBody label={app.label} description={app.description} external />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {(customApps.length > 0 || isAdmin) && (
          <section>
            <SectionHeading title="Added by your team" hint="Open in a new tab" />
            <ul className={gridClass}>
              {customApps.map((app) => (
                <li key={`custom-${app.id}`} className="relative">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${cardClass} ${isAdmin ? "pr-11" : ""}`}
                  >
                    <AppTile label={app.label} custom />
                    <CardBody label={app.label} description={hostOf(app.url)} external />
                  </a>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        aria-label={`Manage ${app.label}`}
                        aria-haspopup="menu"
                        aria-expanded={menuFor === app.id}
                        onClick={() => setMenuFor(menuFor === app.id ? null : app.id)}
                        className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                      >
                        <span aria-hidden="true">⋯</span>
                      </button>
                      {menuFor === app.id && (
                        <>
                          <button
                            type="button"
                            aria-label="Close menu"
                            className="fixed inset-0 z-10 cursor-default"
                            onClick={() => setMenuFor(null)}
                          />
                          <div
                            role="menu"
                            className="absolute bottom-11 right-2.5 z-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                          >
                            <button
                              role="menuitem"
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100"
                              onClick={() => openForm(app)}
                            >
                              Edit
                            </button>
                            <button
                              role="menuitem"
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setDeleteError("");
                                setDeleting(app);
                                setMenuFor(null);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}

              {isAdmin && (
                <li>
                  <button
                    type="button"
                    onClick={() => openForm()}
                    className="group flex h-full min-h-[5.5rem] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-4 text-sm font-medium text-slate-500 transition hover:border-team hover:bg-white hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-team"
                  >
                    <span className="text-xl leading-none" aria-hidden="true">
                      +
                    </span>
                    Add app
                  </button>
                </li>
              )}
            </ul>
          </section>
        )}

        {apps.isError && (
          <p role="alert" className="mt-6 text-sm text-slate-500">
            Your team's added apps could not be loaded.
          </p>
        )}
      </div>

      <AppFormDialog open={formOpen} onOpenChange={setFormOpen} app={editing} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the launcher for your whole team. The tool itself is not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
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
                remove.mutateAsync(deleting.id).then(
                  () => setDeleting(null),
                  (e: unknown) => setDeleteError(appsErrorMessage(e)),
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
