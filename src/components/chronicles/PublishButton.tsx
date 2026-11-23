import { useState } from "react";
import { Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { chroniclesApi } from "../../services/chroniclesApi";
import { useChroniclesMutations } from "../../hooks/useChronicles";
import type { ChroniclesTimeline } from "../../types/chronicles";

export default function PublishButton({
  timeline,
  disabled,
}: {
  timeline: ChroniclesTimeline | undefined;
  disabled?: boolean;
}) {
  const { saveTimeline } = useChroniclesMutations();
  const [error, setError] = useState("");
  const publishing = saveTimeline.isPending;

  async function publish() {
    if (!timeline || publishing || timeline.status !== "draft") return;
    setError("");
    try {
      // Read current settings so publishing does not overwrite edits made since the entries
      // page was opened. The update API requires the full settings.
      const current = await chroniclesApi.timeline(timeline.id);
      if (current.status !== "draft") {
        if (current.status === "archived")
          setError("Restore this timeline to draft in Settings before publishing.");
        return;
      }
      await saveTimeline.mutateAsync({
        id: timeline.id,
        data: {
          name: current.name,
          slug: current.slug,
          description: current.description,
          theme: current.theme,
          config: current.config,
          status: "published",
        },
      });
      toast.success(`Published "${current.name}"`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const published = timeline?.status === "published";
  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant={published ? "outline" : "default"}
        disabled={disabled || !timeline || publishing || timeline.status !== "draft"}
        aria-busy={publishing}
        onClick={() => void publish()}
      >
        {publishing ? (
          <Spinner aria-label="Publishing timeline" />
        ) : published ? (
          <Check />
        ) : (
          <Upload />
        )}
        {published ? "Published" : timeline?.status === "archived" ? "Archived" : "Publish"}
      </Button>
      {error && (
        <p role="alert" className="max-w-sm text-sm text-red-600">
          {error}
        </p>
      )}
      {published && (
        <span role="status" className="sr-only">
          Timeline is published
        </span>
      )}
    </div>
  );
}
