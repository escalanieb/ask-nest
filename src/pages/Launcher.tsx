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
import { useTeamAppMutations, useTeamApps } from "../hooks/useTeamApps";
import { appsErrorMessage, type TeamApp } from "../services/api/appsApi";

const tileClass =
  "group flex w-28 flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-white hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400";

const labelClass = "w-full break-words text-sm font-medium text-slate-700";

export default function Launcher() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const builtIns = visibleBuiltIns(user);
  const apps = useTeamApps();
  const { remove } = useTeamAppMutations();

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

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-semibold text-slate-800">Choose a tool</h1>
        <ul className="flex flex-wrap gap-4">
          {builtIns.map((app) => (
            <li key={app.id}>
              {app.internal ? (
                <Link to={app.href} className={tileClass}>
                  <AppTile icon={app.icon} label={app.label} />
                  <span className={labelClass}>{app.label}</span>
                </Link>
              ) : (
                <a href={app.href} target="_blank" rel="noopener noreferrer" className={tileClass}>
                  <AppTile icon={app.icon} label={app.label} />
                  <span className={labelClass}>{app.label}</span>
                </a>
              )}
            </li>
          ))}

          {(apps.data ?? [])
            .filter((app) => isSafeHref(app.url))
            .map((app) => (
              <li key={`custom-${app.id}`} className="relative">
                <a href={app.url} target="_blank" rel="noopener noreferrer" className={tileClass}>
                  <AppTile label={app.label} custom />
                  <span className={labelClass}>{app.label}</span>
                </a>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      aria-label={`Manage ${app.label}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === app.id}
                      onClick={() => setMenuFor(menuFor === app.id ? null : app.id)}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800"
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
                          className="absolute right-1 top-9 z-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
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
              <button type="button" onClick={() => openForm()} className={tileClass}>
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-3xl text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600"
                  aria-hidden="true"
                >
                  +
                </span>
                <span className={labelClass}>Add app</span>
              </button>
            </li>
          )}
        </ul>

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
