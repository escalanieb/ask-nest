import { useEffect, useState } from "react";
import { ImageIcon, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chroniclesApi } from "../../services/chroniclesApi";

export default function EntryThumbnail({
  timelineId,
  entryId,
  imageUrl,
  title,
}: {
  timelineId: string;
  entryId: number | string;
  imageUrl?: string | null;
  title: string;
}) {
  const uploaded = !!imageUrl?.startsWith(`timelines/${timelineId}/`);
  const external = !!imageUrl && /^https?:\/\//i.test(imageUrl);
  const [source, setSource] = useState<string | null>(external ? imageUrl! : null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Uploaded images are private: fetch them with the signed-in session and show a blob URL.
  useEffect(() => {
    if (!uploaded) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    chroniclesApi
      .entryImage(timelineId, entryId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uploaded, timelineId, entryId]);

  if (!imageUrl || (!uploaded && !external) || failed) {
    const label = imageUrl ? "Image unavailable" : "No image";
    return (
      <div
        className="flex h-10 w-14 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"
        role="img"
        aria-label={label}
        title={label}
      >
        {imageUrl ? <ImageOff className="size-5" /> : <ImageIcon className="size-5" />}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        className="relative h-10 w-14 overflow-hidden rounded-md border border-slate-200 p-0"
        disabled={!loaded}
        aria-label={`Preview image for ${title}`}
        onClick={() => setOpen(true)}
      >
        {!loaded && (
          <Skeleton
            className="absolute inset-0 h-full w-full"
            aria-label="Fetching image"
            role="status"
          />
        )}
        {source && (
          <img
            src={source}
            alt=""
            width={80}
            height={56}
            className="h-full w-full object-cover"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            referrerPolicy="no-referrer"
          />
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="pr-8">{title}</DialogTitle>
          </DialogHeader>
          {source && (
            <img
              src={source}
              alt={title}
              className="max-h-[70dvh] w-full object-contain"
              referrerPolicy="no-referrer"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
