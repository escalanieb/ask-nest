import { useState, useEffect } from "react";
import { useVideoStore } from "../../stores/useVideoStore";

// ---------------------------------------------------------------------------
// Types & embed parser
// ---------------------------------------------------------------------------

type Platform = "youtube" | "facebook";

interface VideoSource {
  platform: Platform;
  src: string;
  label: string;
  name: string;
}

// Accepts a raw <iframe> embed snippet OR a plain embed src/URL.
// Always returns { src, platform, label } or null if unrecognised.
function parseEmbedInput(
  raw: string,
): { src: string; platform: Platform; label: string } | null {
  const trimmed = raw.trim();

  // Extract src from an <iframe …> embed snippet
  let src = trimmed;
  if (trimmed.startsWith("<")) {
    const m = trimmed.match(/\bsrc=["']([^"']+)["']/i);
    if (!m) return null;
    src = m[1];
  }

  // Detect platform from the src
  let platform: Platform;
  if (/youtu\.be|youtube\.com/.test(src)) {
    platform = "youtube";
  } else if (/facebook\.com|fb\.watch/.test(src)) {
    platform = "facebook";
  } else {
    return null;
  }

  // Build a short human-readable tab label
  let label = src;
  try {
    const u = new URL(src);
    if (platform === "youtube") {
      const parts = u.pathname.split("/").filter(Boolean);
      label = parts[parts.length - 1] ?? src;
    } else {
      const href = u.searchParams.get("href");
      if (href) {
        try {
          const hU = new URL(decodeURIComponent(href));
          const parts = hU.pathname.split("/").filter(Boolean);
          label = parts.slice(-2).join("/") || href;
        } catch {
          label = href.slice(0, 30);
        }
      } else {
        label = u.pathname.split("/").filter(Boolean).pop() ?? src;
      }
    }
  } catch {
    label = src.slice(0, 30);
  }

  return { src, platform, label };
}

// ---------------------------------------------------------------------------
// Embed player — single <iframe> filling its container responsively
// ---------------------------------------------------------------------------

function EmbedPlayer({ src, platform }: { src: string; platform: Platform }) {
  return (
    <iframe
      key={src}
      className="h-full w-full border-0"
      src={src}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      title={platform === "youtube" ? "YouTube video" : "Facebook video"}
    />
  );
}

// ---------------------------------------------------------------------------
// Platform logos (inline SVG — no network request)
// ---------------------------------------------------------------------------

function YouTubeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Channel header bar — shown above the embed when a source is active
// ---------------------------------------------------------------------------

function ChannelHeader({ source }: { source: VideoSource }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-1.5">
      {source.platform === "youtube" ? (
        <YouTubeLogo className="h-4 w-4 shrink-0 text-red-500" />
      ) : (
        <FacebookLogo className="h-4 w-4 shrink-0 text-blue-500" />
      )}
      <span className="flex-1 truncate text-[11px] font-semibold text-slate-200">
        {source.name}
      </span>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
        {source.platform === "youtube" ? "YouTube" : "Facebook"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main VideoPanel — fully self-contained local state
// ---------------------------------------------------------------------------

export default function VideoPanel() {
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Consume pending source signal from sidebar link manager
  const pendingSource = useVideoStore((s) => s.pendingSource);
  const setPendingSource = useVideoStore((s) => s.setPendingSource);
  const savedLinks = useVideoStore((s) => s.savedLinks);

  // On first mount, auto-load all saved links so the panel isn't blank after login
  useEffect(() => {
    if (sources.length > 0) return;
    const initial: VideoSource[] = [];
    for (const link of savedLinks) {
      const parsed = parseEmbedInput(link.url);
      if (parsed) initial.push({ ...parsed, name: link.name });
    }
    if (initial.length > 0) {
      setSources(initial);
      setActiveIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingSource) return;
    const parsed = parseEmbedInput(pendingSource.url);
    if (parsed) {
      setSources((prev) => {
        const next = [...prev, { ...parsed, name: pendingSource.name }];
        setActiveIdx(next.length - 1);
        return next;
      });
    }
    setPendingSource(null);
  }, [pendingSource, setPendingSource]);

  function removeSource(idx: number) {
    setSources((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIdx((ai) => Math.min(ai, Math.max(0, next.length - 1)));
      return next;
    });
  }

  const active = sources[activeIdx] ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black">
      {/* Channel header — shows logo + name of the active source */}
      {active && <ChannelHeader source={active} />}

      {/* Source tabs — shown when more than one source is loaded */}
      {sources.length > 1 && (
        <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-slate-800 bg-slate-950 px-2 py-1">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className={[
                "flex items-center gap-1.5 rounded px-2 py-0.5 text-[9px] font-semibold cursor-pointer transition-colors",
                idx === activeIdx
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800",
              ].join(" ")}
              onClick={() => setActiveIdx(idx)}
            >
              {src.platform === "youtube" ? (
                <YouTubeLogo className="h-3 w-3 shrink-0 text-red-400" />
              ) : (
                <FacebookLogo className="h-3 w-3 shrink-0 text-blue-400" />
              )}
              <span className="max-w-[80px] truncate">{src.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSource(idx);
                }}
                className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Embed area — fills panel responsively */}
      <div className="relative flex-1 overflow-hidden">
        {!active ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex items-center gap-3">
              <YouTubeLogo className="h-8 w-8 text-red-600" />
              <FacebookLogo className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open the{" "}
              <span className="font-semibold text-slate-300">Video Links</span>{" "}
              section in the sidebar
              <br />
              and click a saved link to load it here.
            </p>
          </div>
        ) : (
          <EmbedPlayer src={active.src} platform={active.platform} />
        )}
      </div>
    </div>
  );
}
