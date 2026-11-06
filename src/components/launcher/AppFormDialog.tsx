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
import { APP_LABEL_MAX, normalizeAppUrl } from "../../lib/appRegistry";
import { appsErrorMessage, type TeamApp } from "../../services/api/appsApi";
import { useTeamAppMutations } from "../../hooks/useTeamApps";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding. */
  app?: TeamApp;
}

export default function AppFormDialog({ open, onOpenChange, app }: Props) {
  // Remount the form each time the dialog opens so fields start fresh.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AppForm key={app?.id ?? "new"} app={app} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function AppForm({ app, onDone }: { app?: TeamApp; onDone: () => void }) {
  const { create, update } = useTeamAppMutations();
  const [label, setLabel] = useState(app?.label ?? "");
  const [url, setUrl] = useState(app?.url ?? "");
  const [error, setError] = useState("");
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanLabel = label.trim();
    const cleanUrl = normalizeAppUrl(url);
    if (!cleanLabel) return setError("Enter a label.");
    if (cleanLabel.length > APP_LABEL_MAX)
      return setError(`Label must be ${APP_LABEL_MAX} characters or fewer.`);
    if (!cleanUrl) return setError("Enter a valid link that starts with http:// or https://.");
    setError("");
    const input = { label: cleanLabel, url: cleanUrl };
    const request = app ? update.mutateAsync({ id: app.id, ...input }) : create.mutateAsync(input);
    request.then(onDone, (e: unknown) => setError(appsErrorMessage(e)));
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{app ? "Edit app" : "Add app"}</DialogTitle>
        <DialogDescription>
          Add a link to a tool. It will appear on the launcher for your whole team.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="app-label">Label</Label>
        <Input
          id="app-label"
          value={label}
          maxLength={APP_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Budget tracker"
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="app-url">Link</Label>
        <Input
          id="app-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.org"
          inputMode="url"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : app ? "Save" : "Add app"}
        </Button>
      </DialogFooter>
    </form>
  );
}
