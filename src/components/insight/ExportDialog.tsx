import { useCallback, useMemo, useState } from "react";
import {
  Check,
  Clipboard,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { NewsItem } from "@/types/insight";

// ── Emoji map for reactions ───────────────────────────────────────────────────
const REACTION_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  care: "🤗",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};

const REACTION_LABEL: Record<string, string> = {
  like: "Like",
  love: "Love",
  care: "Care",
  haha: "Haha",
  wow: "Wow",
  sad: "Sad",
  angry: "Angry",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripPercent(value?: string | null): string {
  if (!value) return "0";
  return String(value).replace("%", "").trim();
}

/** Split a paragraph into bullet sentences. */
function sentenceBullets(paragraph?: string | null): string {
  if (!paragraph?.trim()) return "";
  // Split on ". " or ".\n" keeping the period
  const sentences = paragraph
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.map((s) => `• ${s}`).join("\n");
}

function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function reactionBreakdownLines(news: NewsItem): string {
  const reactions = news.reactions;
  const total = news.reaction_count ?? 0;
  if (!reactions || total === 0) return "No reaction data available.";

  return Object.entries(reactions)
    .filter(([, count]) => (count ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(([key, count]) => {
      const emoji = REACTION_EMOJI[key] ?? "•";
      const label = REACTION_LABEL[key] ?? key;
      const pct = total > 0 ? Math.round(((count ?? 0) / total) * 100) : 0;
      return `${emoji} ${label} – ${(count ?? 0).toLocaleString()} (${pct}%)`;
    })
    .join("\n");
}

function buildExportText(
  news: NewsItem,
  includeRecoAction: boolean,
  includeAnalysisReport: boolean
): string {
  const sentiment = news.sentiment;
  const totalComments = sentiment?.total_comments ?? news.comment_count ?? 0;
  const scrapedComments = news.comment_count ?? 0;
  const positive = stripPercent(sentiment?.positive);
  const negative = stripPercent(sentiment?.negative);
  const neutral  = stripPercent(sentiment?.neutral);

  const lines: string[] = [];

  // ── Header ──────────────────────────────────────────
  const title = news.title?.trim() || "Untitled";
  lines.push(`Livestream: ${title}`);
  lines.push(news.link ?? "");
  lines.push("");

  // ── Date ────────────────────────────────────────────
  lines.push(`Date and Time Created: ${formatDatetime(news.created_at)}`);
  lines.push("");

  // ── Sampling note ───────────────────────────────────
  lines.push(
    `From a Random Sampling of *${scrapedComments}* Comments out of ${totalComments}, with 95% Confidence Rate +/- of 3% margin of error:`
  );
  lines.push("");

  // ── Sentiment percentages ───────────────────────────
  lines.push(`${positive}% Positive`);
  lines.push(`${negative}% Negative`);
  lines.push(`${neutral}% Neutral`);
  lines.push("");

  // ── Reaction breakdown ──────────────────────────────
  lines.push("Reaction Breakdown:");
  lines.push(reactionBreakdownLines(news));
  lines.push("");
  lines.push("—");
  lines.push("");

  // ── Summary ─────────────────────────────────────────
  lines.push("Summary:");
  lines.push(sentenceBullets(news.summary));

  // ── Optional: Recommended Action ────────────────────
  if (includeRecoAction && news.reco_action?.trim()) {
    lines.push("");
    lines.push("—");
    lines.push("");
    lines.push("Recommended Action:");
    lines.push(news.reco_action.trim());
  }

  // ── Optional: Analysis Report ───────────────────────
  if (includeAnalysisReport && sentiment) {
    const reportLines: string[] = [];

    if (sentiment.risk_level)
      reportLines.push(`Risk Level: ${sentiment.risk_level}`);
    if (sentiment.reaction_tone)
      reportLines.push(
        `Reaction Tone: ${sentiment.reaction_tone.charAt(0).toUpperCase() + sentiment.reaction_tone.slice(1)}`
      );
    if (sentiment.signal_alignment)
      reportLines.push(
        `Signal Alignment: ${sentiment.signal_alignment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
      );
    if (sentiment.dominant_reaction)
      reportLines.push(
        `Dominant Reaction: ${REACTION_EMOJI[sentiment.dominant_reaction] ?? ""} ${
          REACTION_LABEL[sentiment.dominant_reaction] ?? sentiment.dominant_reaction
        }${sentiment.dominant_reaction_percentage ? ` (${sentiment.dominant_reaction_percentage}%)` : ""}`
      );
    if (sentiment.reaction_summary) {
      reportLines.push("");
      reportLines.push("Reaction Summary:");
      reportLines.push(sentiment.reaction_summary.trim());
    }

    if (reportLines.length > 0) {
      lines.push("");
      lines.push("—");
      lines.push("");
      lines.push("Analysis Report:");
      lines.push(reportLines.join("\n"));
    }
  }

  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ExportDialogProps {
  news: NewsItem | null;
  onClose: () => void;
}

export function ExportDialog({ news, onClose }: ExportDialogProps) {
  const [includeRecoAction, setIncludeRecoAction] = useState(false);
  const [includeAnalysisReport, setIncludeAnalysisReport] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    if (!news) return "";
    return buildExportText(news, includeRecoAction, includeAnalysisReport);
  }, [news, includeRecoAction, includeAnalysisReport]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <Dialog open={!!news} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Clipboard className="size-4 text-primary" />
            Quick Export
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Build and copy a formatted report text to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-0">
          {/* Optional section toggles */}
          <div className="flex items-center gap-6 px-6 py-3 border-b border-border/40 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">
              Include:
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <div
                className={`flex size-4 items-center justify-center rounded border transition-colors ${
                  includeRecoAction
                    ? "border-primary bg-primary"
                    : "border-border/70 bg-background group-hover:border-primary/50"
                }`}
                onClick={() => setIncludeRecoAction((v) => !v)}
              >
                {includeRecoAction && <Check className="size-3 text-white stroke-[3]" />}
              </div>
              <span
                className="text-sm text-foreground/80"
                onClick={() => setIncludeRecoAction((v) => !v)}
              >
                Recommended Action
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <div
                className={`flex size-4 items-center justify-center rounded border transition-colors ${
                  includeAnalysisReport
                    ? "border-primary bg-primary"
                    : "border-border/70 bg-background group-hover:border-primary/50"
                }`}
                onClick={() => setIncludeAnalysisReport((v) => !v)}
              >
                {includeAnalysisReport && <Check className="size-3 text-white stroke-[3]" />}
              </div>
              <span
                className="text-sm text-foreground/80"
                onClick={() => setIncludeAnalysisReport((v) => !v)}
              >
                Analysis Report
              </span>
            </label>
          </div>

          {/* Text preview */}
          <textarea
            readOnly
            value={text}
            className="w-full resize-none bg-background px-6 py-4 font-mono text-xs leading-relaxed text-foreground/90 focus:outline-none"
            style={{ minHeight: "360px", maxHeight: "480px" }}
            spellCheck={false}
          />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className={`gap-1.5 transition-all ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : ""
              }`}
            >
              {copied ? (
                <>
                  <ClipboardCheck className="size-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard className="size-3.5" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
