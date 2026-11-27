import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertTriangle,
  Activity,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { insightFetch, type InsightApiError } from "@/services/insightApi";
import type {
  AnalysisType,
  NewsItem,
  NewsSnapshot,
  PaginatedNewsResponse,
  Sentiment,
} from "@/types/insight";
import { ExportDialog } from "@/components/insight/ExportDialog";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EditorMode = "create" | "edit";
type SentimentTone = "positive" | "neutral" | "negative" | "mixed";

interface LinkEntry {
  id: string;
  url: string;
  totalComments: string;
  source: string;
}

interface NewsFormState {
  title: string;
  link: string;
  source: string;
  linkEntries: LinkEntry[];
  summary: string;
  reco_action: string;
  main_themes: string;
  overall_sentiment: SentimentTone;
  positive: string;
  negative: string;
  neutral: string;
  mixed: string;
  risk_level: string;
  total_comments: string;
  analysis_type: AnalysisType;
  track_days: string;
  interval_minutes: string;
}

const emptyFormState: NewsFormState = {
  title: "",
  link: "",
  source: "",
  linkEntries: [{ id: "1", url: "", totalComments: "", source: "" }],
  summary: "",
  reco_action: "",
  main_themes: "",
  overall_sentiment: "neutral",
  positive: "33%",
  negative: "33%",
  neutral: "34%",
  mixed: "33%",
  risk_level: "2/5",
  total_comments: "0",
  analysis_type: "quick",
  track_days: "3",
  interval_minutes: "180",
};

const comprehensiveIntervalOptions = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 180, label: "3 hours" },
  { value: 360, label: "6 hours" },
  { value: 720, label: "12 hours" },
] as const;

const sentimentToneLabels: Record<SentimentTone, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  mixed: "Mixed",
};

const sentimentToneStyles: Record<SentimentTone, string> = {
  positive: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20",
  neutral: "bg-slate-500/12 text-slate-700 ring-slate-500/20",
  negative: "bg-rose-500/12 text-rose-700 ring-rose-500/20",
  mixed: "bg-amber-500/12 text-amber-700 ring-amber-500/20",
};

type ScrapingStatus = "scraping" | "done";

function getScrapingStatus(value?: string | null): ScrapingStatus {
  if (value === "scraping") return "scraping";
  return "done";
}

function StatusBadge({ status }: { status: ScrapingStatus }) {
  if (status === "scraping") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
        </span>
        Scraping
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20">
      <CheckCircle2 className="size-3.5" />
      Done
    </span>
  );
}

const columnHelper = createColumnHelper<NewsItem>();

type AnalysisOptions = {
  analysis_type: AnalysisType;
  track_days?: number;
  interval_minutes?: number;
};
type CreateSingleLinkPayload = AnalysisOptions & {
  link: string;
  comment_count?: number | null;
};
type CreateBulkLinksPayload = AnalysisOptions & {
  links: Array<{ link: string; comment_count?: number | null }>;
};
type FullNewsPayload = {
  title: string;
  link: string;
  source?: string | null;
  summary: string;
  reco_action: string;
  main_themes: string[];
  sentiment: Sentiment;
  comment_count?: number;
};
type CreateNewsPayload = CreateSingleLinkPayload | CreateBulkLinksPayload | FullNewsPayload;

function toFormState(item?: NewsItem | null): NewsFormState {
  if (!item) return emptyFormState;
  return {
    title: item.title ?? "",
    link: item.link ?? "",
    source: item.source ?? "",
    linkEntries: [],
    summary: item.summary ?? "",
    reco_action: item.reco_action ?? "",
    main_themes: Array.isArray(item.main_themes) ? item.main_themes.join(", ") : "",
    overall_sentiment: (item.sentiment?.overall_sentiment as SentimentTone) || "neutral",
    positive: item.sentiment?.positive ?? "",
    negative: item.sentiment?.negative ?? "",
    neutral: item.sentiment?.neutral ?? "",
    mixed: item.sentiment?.mixed ?? "",
    risk_level: item.sentiment?.risk_level ?? "",
    total_comments: String(item.sentiment?.total_comments ?? 0),
    analysis_type: item.analysis_type ?? "quick",
    track_days: String(item.track_days ?? 3),
    interval_minutes: String(item.interval_minutes ?? 180),
  };
}

function SnapshotTrendChart({ snapshots }: { snapshots: NewsSnapshot[] }) {
  const width = 760;
  const height = 260;
  const padding = 38;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const x = (index: number) =>
    snapshots.length <= 1 ? width / 2 : padding + (index / (snapshots.length - 1)) * plotWidth;
  const y = (value: number | null | undefined) =>
    padding + ((100 - Math.max(0, Math.min(100, value ?? 0))) / 100) * plotHeight;
  const series = [
    { key: "positive_percentage" as const, label: "Positive", color: "#059669" },
    { key: "negative_percentage" as const, label: "Negative", color: "#e11d48" },
    { key: "neutral_percentage" as const, label: "Neutral", color: "#64748b" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[620px]"
          role="img"
          aria-label="Sentiment percentages over comprehensive analysis rounds"
        >
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={padding}
                x2={width - padding}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="4 5"
              />
              <text x={4} y={y(tick) + 4} className="fill-muted-foreground text-[10px]">
                {tick}%
              </text>
            </g>
          ))}
          {series.map((item) => {
            const points = snapshots
              .map((snapshot, index) => `${x(index)},${y(snapshot[item.key])}`)
              .join(" ");
            return (
              <g key={item.key}>
                {snapshots.length > 1 && (
                  <polyline
                    points={points}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {snapshots.map((snapshot, index) => (
                  <circle
                    key={snapshot.id}
                    cx={x(index)}
                    cy={y(snapshot[item.key])}
                    r="4"
                    fill={item.color}
                  >
                    <title>{`${item.label}: ${snapshot[item.key] ?? 0}% — round ${snapshot.round_number}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {snapshots.map((snapshot, index) => (
            <text
              key={snapshot.id}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              R{snapshot.round_number}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

const reactionSeries = [
  { key: "like", label: "Like", emoji: "👍", color: "#2563eb" },
  { key: "love", label: "Love", emoji: "❤️", color: "#e11d48" },
  { key: "care", label: "Care", emoji: "🤗", color: "#f59e0b" },
  { key: "haha", label: "Haha", emoji: "😂", color: "#eab308" },
  { key: "wow", label: "Wow", emoji: "😮", color: "#8b5cf6" },
  { key: "sad", label: "Sad", emoji: "😢", color: "#64748b" },
  { key: "angry", label: "Angry", emoji: "😡", color: "#dc2626" },
] as const;

type ReactionKey = (typeof reactionSeries)[number]["key"];
type ReactionSelection = "total" | ReactionKey;

function formatMetric(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

function snapshotReactionBreakdown(snapshot: NewsSnapshot) {
  const payloadReactionCounts = snapshot.payload?.reaction_counts;
  const payloadReactions = snapshot.payload?.reactions;
  const source =
    snapshot.reactions ??
    (payloadReactionCounts && typeof payloadReactionCounts === "object"
      ? payloadReactionCounts
      : payloadReactions && typeof payloadReactions === "object"
        ? payloadReactions
        : null);

  if (!source) return null;

  const record = source as Record<string, unknown>;
  const normalized: Partial<Record<ReactionKey, number>> = {};

  for (const reaction of reactionSeries) {
    const raw = reaction.key === "angry" ? (record.angry ?? record.anger) : record[reaction.key];
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) normalized[reaction.key] = value;
  }

  return Object.keys(normalized).length ? normalized : null;
}

function snapshotReactionTotal(snapshot: NewsSnapshot) {
  if (snapshot.reaction_count !== null && snapshot.reaction_count !== undefined) {
    return snapshot.reaction_count;
  }

  const reactions = snapshotReactionBreakdown(snapshot);
  if (!reactions) return null;

  return reactionSeries.reduce((total, reaction) => {
    return total + (reactions[reaction.key] ?? 0);
  }, 0);
}

function ReactionTrendChart({ snapshots }: { snapshots: NewsSnapshot[] }) {
  const [selectedSeries, setSelectedSeries] = useState<ReactionSelection[]>(["total"]);
  const points = snapshots
    .map((snapshot) => ({
      snapshot,
      total: snapshotReactionTotal(snapshot),
      reactions: snapshotReactionBreakdown(snapshot),
    }))
    .filter(
      (
        point,
      ): point is {
        snapshot: NewsSnapshot;
        total: number;
        reactions: Partial<Record<ReactionKey, number>> | null;
      } => point.total !== null,
    );

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        Reaction history will appear after a round returns reaction data.
      </div>
    );
  }

  const width = 760;
  const height = 240;
  const padding = 42;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const selectedDefinitions = selectedSeries.map((key) =>
    key === "total"
      ? { key, label: "Total", emoji: "Σ", color: "#7c3aed" }
      : reactionSeries.find((reaction) => reaction.key === key)!,
  );
  const seriesValue = (point: (typeof points)[number], key: ReactionSelection) =>
    key === "total" ? point.total : (point.reactions?.[key] ?? null);
  const maximum = Math.max(
    ...selectedDefinitions.flatMap((series) =>
      points.map((point) => seriesValue(point, series.key) ?? 0),
    ),
    1,
  );
  const x = (index: number) =>
    points.length <= 1 ? width / 2 : padding + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) => padding + (1 - value / maximum) * plotHeight;
  const latest = points.at(-1)!;
  const previous = points.at(-2);
  const delta = previous ? latest.total - previous.total : null;
  const breakdowns = points.filter((point) => point.reactions);
  const displayedBreakdowns = breakdowns.slice(-12);
  const labelEvery = Math.max(1, Math.ceil(points.length / 10));
  const deltas = points.slice(1).map((point, index) => ({
    point,
    value: point.total - points[index].total,
  }));
  const deltaWidth = 760;
  const deltaHeight = 150;
  const deltaPadding = 42;
  const deltaMaximum = Math.max(...deltas.map((item) => item.value), 0);
  const deltaMinimum = Math.min(...deltas.map((item) => item.value), 0);
  const deltaRange = Math.max(deltaMaximum - deltaMinimum, 1);
  const deltaY = (value: number) => 16 + ((deltaMaximum - value) / deltaRange) * (deltaHeight - 48);
  const zeroY = deltaY(0);
  const deltaX = (index: number) =>
    deltas.length <= 1
      ? deltaWidth / 2
      : deltaPadding + (index / (deltas.length - 1)) * (deltaWidth - deltaPadding * 2);
  const barWidth = Math.max(5, Math.min(30, (deltaWidth - deltaPadding * 2) / deltas.length / 1.8));

  const toggleSeries = (key: ReactionSelection) => {
    if (key === "total") {
      setSelectedSeries(["total"]);
      return;
    }

    setSelectedSeries((current) => {
      const reactionsOnly = current.filter((item) => item !== "total");
      const next = reactionsOnly.includes(key)
        ? reactionsOnly.filter((item) => item !== key)
        : [...reactionsOnly, key].slice(-3);

      return next.length ? next : ["total"];
    });
  };

  const pointTooltip = (point: (typeof points)[number], index: number) => {
    const pointDelta = index > 0 ? point.total - points[index - 1].total : null;
    const reactions = reactionSeries
      .map((reaction) => {
        const count = point.reactions?.[reaction.key];
        return count === undefined ? null : `${reaction.emoji} ${count.toLocaleString()}`;
      })
      .filter(Boolean)
      .join(" · ");

    return `Round ${point.snapshot.round_number} · ${formatDate(point.snapshot.captured_at)}\nTotal: ${point.total.toLocaleString()}${pointDelta === null ? "" : ` · ${pointDelta >= 0 ? "+" : ""}${pointDelta.toLocaleString()} this round`}${reactions ? `\n${reactions}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Latest reactions</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {latest.total.toLocaleString()}
          </p>
        </div>
        {delta !== null ? (
          <Badge variant="secondary" className="gap-1 tabular-nums">
            {delta >= 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {delta >= 0 ? "+" : ""}
            {delta.toLocaleString()} since previous round
          </Badge>
        ) : null}
        {latest.snapshot.like_count_only ? <Badge variant="outline">Likes only</Badge> : null}
      </div>

      {breakdowns.length ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selectedSeries.includes("total")}
              onClick={() => toggleSeries("total")}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedSeries.includes("total")
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Σ Total
            </button>
            {reactionSeries.map((reaction) => {
              const active = selectedSeries.includes(reaction.key);
              return (
                <button
                  key={reaction.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSeries(reaction.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-current bg-muted text-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                  style={active ? { color: reaction.color } : undefined}
                >
                  {reaction.emoji} {reaction.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select up to three reaction types to compare. Choose Total to reset the chart.
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[620px]"
          role="img"
          aria-label="Selected reaction counts over comprehensive analysis rounds"
        >
          {[0, 0.5, 1].map((ratio) => {
            const tick = maximum * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray="4 5"
                />
                <text x={4} y={y(tick) + 4} className="fill-muted-foreground text-[10px]">
                  {formatMetric(tick)}
                </text>
              </g>
            );
          })}
          {selectedDefinitions.map((series) => {
            const seriesPoints = points
              .map((point, index) => ({ point, index, value: seriesValue(point, series.key) }))
              .filter(
                (item): item is { point: (typeof points)[number]; index: number; value: number } =>
                  item.value !== null,
              );

            return (
              <g key={series.key}>
                {seriesPoints.length > 1 ? (
                  <polyline
                    points={seriesPoints
                      .map((item) => `${x(item.index)},${y(item.value)}`)
                      .join(" ")}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {seriesPoints.map((item) => (
                  <circle
                    key={`${series.key}-${item.point.snapshot.id}`}
                    cx={x(item.index)}
                    cy={y(item.value)}
                    r="4"
                    fill={series.color}
                  >
                    <title>{`${series.emoji} ${series.label}: ${item.value.toLocaleString()}${
                      item.index > 0 && seriesValue(points[item.index - 1], series.key) !== null
                        ? ` · ${item.value - (seriesValue(points[item.index - 1], series.key) ?? 0) >= 0 ? "+" : ""}${(
                            item.value - (seriesValue(points[item.index - 1], series.key) ?? 0)
                          ).toLocaleString()} from previous`
                        : ""
                    }\n${pointTooltip(item.point, item.index)}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
          {points.map((point, index) => (
            <g key={point.snapshot.id}>
              {index === 0 || index === points.length - 1 || index % labelEvery === 0 ? (
                <text
                  x={x(index)}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  R{point.snapshot.round_number}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      {deltas.length ? (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-background p-2">
          <div className="flex items-center justify-between px-2 pt-1">
            <div>
              <p className="text-sm font-medium">New reactions per round</p>
              <p className="text-xs text-muted-foreground">
                Change in total reactions since the preceding capture.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${deltaWidth} ${deltaHeight}`}
              className="min-w-[620px]"
              role="img"
              aria-label="New reactions captured during each analysis interval"
            >
              <line
                x1={deltaPadding}
                x2={deltaWidth - deltaPadding}
                y1={zeroY}
                y2={zeroY}
                stroke="currentColor"
                className="text-border"
              />
              {deltas.map((item, index) => {
                const valueY = deltaY(item.value);
                return (
                  <g key={item.point.snapshot.id}>
                    <rect
                      x={deltaX(index) - barWidth / 2}
                      y={Math.min(valueY, zeroY)}
                      width={barWidth}
                      height={Math.max(2, Math.abs(zeroY - valueY))}
                      rx="3"
                      fill={item.value >= 0 ? "#7c3aed" : "#e11d48"}
                    >
                      <title>{`Round ${item.point.snapshot.round_number}: ${item.value >= 0 ? "+" : ""}${item.value.toLocaleString()} reactions\n${formatDate(item.point.snapshot.captured_at)}`}</title>
                    </rect>
                    <text
                      x={deltaX(index)}
                      y={deltaHeight - 7}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      R{item.point.snapshot.round_number}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      ) : null}

      {breakdowns.length ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-background p-4">
          <div>
            <p className="text-sm font-medium">Reaction mix by round</p>
            <p className="text-xs text-muted-foreground">
              Each bar represents 100% of the available reaction breakdown.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {reactionSeries.map((reaction) => (
                <span key={reaction.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: reaction.color }}
                  />
                  {reaction.label}
                </span>
              ))}
            </div>
            {breakdowns.length > displayedBreakdowns.length ? (
              <span className="text-xs text-muted-foreground">Latest 12 rounds</span>
            ) : null}
          </div>
          <div className="space-y-2.5">
            {displayedBreakdowns.map(({ snapshot, reactions }) => {
              const breakdownTotal = reactionSeries.reduce(
                (total, reaction) => total + (reactions?.[reaction.key] ?? 0),
                0,
              );

              return (
                <div key={snapshot.id} className="grid grid-cols-[2rem_1fr] items-center gap-2">
                  <span className="text-xs text-muted-foreground">R{snapshot.round_number}</span>
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                    {reactionSeries.map((reaction) => {
                      const count = reactions?.[reaction.key] ?? 0;
                      return count > 0 ? (
                        <span
                          key={reaction.key}
                          style={{
                            width: `${(count / Math.max(breakdownTotal, 1)) * 100}%`,
                            backgroundColor: reaction.color,
                          }}
                          title={`${reaction.emoji} ${reaction.label}: ${count.toLocaleString()} (${((count / Math.max(breakdownTotal, 1)) * 100).toFixed(1)}%) · Round ${snapshot.round_number} · ${formatDate(snapshot.captured_at)}`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 || hours > 0 ? `${minutes}m` : null,
    `${seconds}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatRoundCount(count: number) {
  return `${count} ${count === 1 ? "round" : "rounds"}`;
}

function isMonitoringOngoing(news: NewsItem) {
  if (news.analysis_type !== "comprehensive" || news.monitoring_status === "stopped") {
    return false;
  }

  const trackingEndsAt =
    new Date(news.created_at).getTime() + (news.track_days ?? 3) * 24 * 60 * 60 * 1000;

  return trackingEndsAt > Date.now();
}

function formatIntervalLabel(minutes: number) {
  return (
    comprehensiveIntervalOptions.find((option) => option.value === minutes)?.label ??
    `${minutes} minutes`
  );
}

function NextRoundSchedule({
  news,
  latestSnapshot,
  compact = false,
}: {
  news: NewsItem;
  latestSnapshot?: NewsSnapshot | null;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (news.monitoring_status === "stopped") {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-700">
        <Square className="size-3.5 fill-current" /> Monitoring stopped
        {news.monitoring_stopped_at ? ` · ${formatShortDate(news.monitoring_stopped_at)}` : ""}
      </div>
    );
  }

  if (!latestSnapshot) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" /> First round pending
      </div>
    );
  }

  const intervalMinutes = news.interval_minutes ?? 180;
  const nextRoundAt = new Date(latestSnapshot.captured_at).getTime() + intervalMinutes * 60 * 1000;
  const trackingEndsAt =
    new Date(news.created_at).getTime() + (news.track_days ?? 3) * 24 * 60 * 60 * 1000;

  if (nextRoundAt > trackingEndsAt) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" /> Tracking window complete
      </div>
    );
  }

  const remaining = nextRoundAt - now;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 font-mono text-xs font-medium tabular-nums text-primary">
          <Clock3 className="size-3.5 shrink-0" />
          {remaining > 0 ? formatCountdown(remaining) : "Due now"}
        </div>
        <p className="whitespace-nowrap text-[11px] text-muted-foreground">
          Round {latestSnapshot.round_number} · {formatShortDate(nextRoundAt)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Clock3 className="size-3.5" />
      <span>
        Estimated next round:{" "}
        <strong className="font-medium text-foreground">
          {formatDate(new Date(nextRoundAt).toISOString())}
        </strong>
      </span>
      <span className="font-mono tabular-nums text-primary">
        {remaining > 0 ? `in ${formatCountdown(remaining)}` : "due now — awaiting workflow"}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseThemes(value: string) {
  return value
    .split(",")
    .map((theme) => theme.trim())
    .filter(Boolean);
}

function getSentimentTone(value?: string | null): SentimentTone {
  if (value === "positive" || value === "negative" || value === "neutral" || value === "mixed") {
    return value as SentimentTone;
  }
  return "neutral";
}

function formatRiskValue(value?: string | number | null) {
  if (value === null || value === undefined) return "Unknown";
  return String(value);
}

function extractRiskScore(riskLevel?: string | number | null) {
  if (!riskLevel) return 0;
  const raw = String(riskLevel).split("/")[0];
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateSampleSize(totalComments: number): number {
  const Z = 1.96;
  const p = 0.5;
  const e = 0.05;
  const n0 = (Z * Z * p * (1 - p)) / (e * e);
  if (totalComments <= 0) return 0;
  const n = n0 / (1 + (n0 - 1) / totalComments);
  return Math.round(n);
}

function calculateCommentCount(totalComments: number): number {
  const commentCount = Number(totalComments) || 0;
  if (commentCount <= 250) return commentCount;
  return calculateSampleSize(commentCount);
}

function NewsMetric({
  label,
  value,
  hint,
  icon,
  glowColor = "hsl(220 90% 56%)",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  glowColor?: string;
}) {
  return (
    <div
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/80 hover:shadow-lg"
      style={{ "--glow": glowColor } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, var(--glow) 30%, transparent), transparent 70%)`,
        }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span
          className="flex size-7 items-center justify-center rounded-lg transition-colors duration-300"
          style={{
            background: `color-mix(in srgb, var(--glow) 15%, transparent)`,
            color: `var(--glow)`,
          }}
        >
          {icon}
        </span>
      </div>
      <p
        className="font-mono text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground/70">{hint}</p>
    </div>
  );
}

export default function NewsWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [toneFilter, setToneFilter] = useState<"all" | SentimentTone>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [analysisFilter, setAnalysisFilter] = useState<"all" | AnalysisType>("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [stopTarget, setStopTarget] = useState<NewsItem | null>(null);
  const [sentimentTarget, setSentimentTarget] = useState<NewsItem | null>(null);
  const [exportTarget, setExportTarget] = useState<NewsItem | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"xlsx" | "csv" | null>(null);
  const [form, setForm] = useState<NewsFormState>(emptyFormState);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showAdvancedReport, setShowAdvancedReport] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearch(nextValue);
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  }, []);

  const newsQuery = useQuery({
    queryKey: [
      "insight-news",
      deferredSearch,
      analysisFilter,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        per_page: String(pagination.pageSize),
      });
      if (analysisFilter !== "all") params.set("analysis_type", analysisFilter);
      const endpoint = deferredSearch
        ? `/news/search?q=${encodeURIComponent(deferredSearch)}&${params.toString()}`
        : `/news?${params.toString()}`;
      return insightFetch<PaginatedNewsResponse>(endpoint);
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60 * 1000,
    retry: false,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["insight-news-snapshots", sentimentTarget?.id],
    queryFn: () => insightFetch<{ data: NewsSnapshot[] }>(`/news/${sentimentTarget?.id}/snapshots`),
    enabled: Boolean(sentimentTarget?.id && sentimentTarget.analysis_type === "comprehensive"),
    refetchInterval: sentimentTarget?.analysis_type === "comprehensive" ? 60 * 1000 : false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateNewsPayload) =>
      insightFetch<{ data: NewsItem }>("/news", "POST", payload as Record<string, unknown>),
    onSuccess: async () => {
      toast.success("News item created successfully");
      setEditorOpen(false);
      setEditingItem(null);
      setForm(emptyFormState);
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError) => {
      toast.error(error.message || "Failed to create news item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      insightFetch<{ data: NewsItem }>(`/news/${id}`, "PUT", payload),
    onSuccess: async () => {
      toast.success("News item updated successfully");
      setEditorOpen(false);
      setEditingItem(null);
      setForm(emptyFormState);
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError) => {
      toast.error(error.message || "Failed to update news item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => insightFetch<{ message: string }>(`/news/${id}`, "DELETE"),
    onMutate: async (id: number) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic removal
      await queryClient.cancelQueries({ queryKey: ["insight-news"] });
      // Snapshot all cached pages for rollback on error
      const previousData = queryClient.getQueriesData<PaginatedNewsResponse>({
        queryKey: ["insight-news"],
      });
      // Immediately remove from every cached page — item disappears instantly
      queryClient.setQueriesData<PaginatedNewsResponse>({ queryKey: ["insight-news"] }, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((item) => item.id !== id) };
      });
      // Close dialog right away
      setDeleteTarget(null);
      return { previousData };
    },
    onSuccess: async () => {
      toast.success("News item deleted successfully");
      // Refetch to sync server-side pagination totals
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError, _id, context) => {
      // Rollback: restore item in cache so it reappears if deletion failed
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(error.message || "Failed to delete news item");
    },
  });

  const stopMonitoringMutation = useMutation({
    mutationFn: async (id: number) =>
      insightFetch<{ data: NewsItem; message: string }>(`/news/${id}/stop-monitoring`, "POST"),
    onSuccess: async ({ data, message }) => {
      toast.success(message || "Monitoring stopped successfully");
      setStopTarget(null);
      setSentimentTarget(data);
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
      await queryClient.invalidateQueries({ queryKey: ["insight-news-snapshots", data.id] });
    },
    onError: (error: InsightApiError) => {
      toast.error(error.message || "Failed to stop monitoring");
    },
  });

  const items = useMemo(() => newsQuery.data?.data ?? [], [newsQuery.data]);

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) {
      if (item.source) seen.add(item.source);
    }
    return Array.from(seen).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const toneMatch =
        toneFilter === "all" || getSentimentTone(item.sentiment?.overall_sentiment) === toneFilter;
      const sourceMatch = sourceFilter === "all" || (item.source ?? "") === sourceFilter;
      return toneMatch && sourceMatch;
    });
  }, [items, toneFilter, sourceFilter]);

  const openCreateDialog = useCallback(() => {
    setEditorMode("create");
    setEditingItem(null);
    setForm(emptyFormState);
    setEditorOpen(true);
  }, []);

  const openEditDialog = useCallback((item: NewsItem) => {
    setEditorMode("edit");
    setEditingItem(item);
    setForm(toFormState(item));
    setEditorOpen(true);
  }, []);

  const openDetailsDialog = useCallback((item: NewsItem) => {
    setSentimentTarget(item);
    setShowAdvancedReport(false);
  }, []);

  const openExportDialog = useCallback((item: NewsItem) => {
    setExportTarget(item);
  }, []);

  const downloadComprehensiveExport = useCallback(
    async (item: NewsItem, format: "xlsx" | "csv") => {
      setExportingFormat(format);

      try {
        const blob = await insightFetch<Blob>(
          `/news/${item.id}/export?format=${format}`,
          "GET",
          undefined,
          { responseType: "blob" },
        );
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const exportDate = new Intl.DateTimeFormat("en-CA", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "Asia/Manila",
        }).format(new Date());

        anchor.href = objectUrl;
        anchor.download = `insight-${item.id}-rounds-${exportDate}.${format}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success(`${format.toUpperCase()} export downloaded`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to export analysis";
        toast.error(message);
      } finally {
        setExportingFormat(null);
      }
    },
    [],
  );

  const openEditorFromDetails = useCallback(
    (item: NewsItem) => {
      setSentimentTarget(null);
      openEditDialog(item);
    },
    [openEditDialog],
  );

  const handleEditorOpenChange = useCallback((open: boolean) => {
    setEditorOpen(open);
    if (!open) {
      setForm(emptyFormState);
      setEditingItem(null);
    }
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("created_at", {
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Date
            <ArrowUpDown className="size-3.5" />
          </button>
        ),
        size: 160,
        minSize: 120,
        maxSize: 200,
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        size: 9999,
        minSize: 240,
        cell: (info) => {
          const tone = getSentimentTone(info.row.original.sentiment?.overall_sentiment);
          return (
            <div className="min-w-0 space-y-2">
              <p className="overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] font-medium leading-6 text-foreground">
                {info.getValue()}
              </p>
              <div className="flex flex-wrap gap-2">
                {info.row.original.sentiment && (
                  <Badge className={`w-fit rounded-full text-xs ${sentimentToneStyles[tone]}`}>
                    {sentimentToneLabels[tone]}
                  </Badge>
                )}
                <Badge variant="outline" className="w-fit rounded-full text-xs capitalize">
                  {info.row.original.analysis_type ?? "quick"}
                </Badge>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 120,
        minSize: 100,
        maxSize: 140,
        cell: (info) => <StatusBadge status={getScrapingStatus(info.getValue())} />,
      }),
      columnHelper.display({
        id: "next_round",
        header: "Next round",
        size: 170,
        minSize: 155,
        maxSize: 190,
        cell: ({ row }) =>
          row.original.analysis_type === "comprehensive" ? (
            <NextRoundSchedule
              news={row.original}
              latestSnapshot={row.original.latest_snapshot}
              compact
            />
          ) : (
            <span className="text-xs text-muted-foreground/60">Not applicable</span>
          ),
      }),
      columnHelper.accessor("source", {
        header: "Source",
        size: 140,
        minSize: 100,
        maxSize: 180,
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm text-foreground">{value}</span>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        size: 200,
        minSize: 180,
        maxSize: 220,
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <a
              href={row.original.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <ExternalLink className="size-3.5" />
              Visit
            </a>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => openDetailsDialog(row.original)}
            >
              <ArrowUpRight className="size-4" />
              Details
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-foreground"
              title="Quick Export"
              onClick={() => openExportDialog(row.original)}
            >
              <Clipboard className="size-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [openDetailsDialog, openExportDialog],
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    pageCount: newsQuery.data?.meta?.last_page ?? 0,
    state: { pagination, sorting },
  });

  const metrics = useMemo(() => {
    const total = items.length;
    const positive = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "positive",
    ).length;
    const neutral = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "neutral",
    ).length;
    const negative = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "negative",
    ).length;
    const mixed = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "mixed",
    ).length;
    return { total, positive, neutral, negative, mixed };
  }, [items]);

  const submitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editorMode === "create") {
      const validEntries = form.linkEntries
        .filter((entry) => entry.url.trim())
        .map((entry) => {
          let urlToTest = entry.url.trim();
          if (!/^https?:\/\//i.test(urlToTest)) {
            urlToTest = `https://${urlToTest}`;
          }
          try {
            const normalized = new URL(urlToTest).toString();
            const totalCommentsRaw = entry.totalComments.trim();
            const commentCount = totalCommentsRaw
              ? calculateCommentCount(Number(totalCommentsRaw) || 0)
              : null;
            return {
              url: normalized,
              commentCount,
            };
          } catch {
            return null;
          }
        })
        .filter((entry) => entry !== null) as Array<{
        url: string;
        commentCount: number | null;
      }>;

      if (validEntries.length === 0) {
        toast.error("Please provide at least one valid URL.");
        return;
      }

      const payload: CreateNewsPayload =
        validEntries.length === 1
          ? {
              link: validEntries[0].url,
              comment_count: validEntries[0].commentCount,
              analysis_type: form.analysis_type,
              ...(form.analysis_type === "comprehensive"
                ? {
                    track_days: Number(form.track_days),
                    interval_minutes: Number(form.interval_minutes),
                  }
                : {}),
            }
          : {
              links: validEntries.map((e) => ({
                link: e.url,
                comment_count: e.commentCount,
              })),
              analysis_type: form.analysis_type,
              ...(form.analysis_type === "comprehensive"
                ? {
                    track_days: Number(form.track_days),
                    interval_minutes: Number(form.interval_minutes),
                  }
                : {}),
            };

      await createMutation.mutateAsync(payload);
      return;
    }

    // edit mode
    const payload = {
      title: form.title.trim(),
      link: form.link.trim(),
      source: form.source.trim() || null,
      summary: form.summary.trim(),
      reco_action: form.reco_action.trim(),
      main_themes: parseThemes(form.main_themes),
      comment_count: calculateCommentCount(Number(form.total_comments) || 0),
      sentiment: {
        overall_sentiment: form.overall_sentiment,
        positive: form.positive.trim(),
        mixed: form.mixed.trim(),
        negative: form.negative.trim(),
        neutral: form.neutral.trim(),
        risk_level: form.risk_level.trim(),
        total_comments: Number(form.total_comments) || 0,
      } satisfies Sentiment,
    };

    if (editorMode === "edit" && editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  // Suppress unused variable warning for extractRiskScore (kept for potential future use)
  void extractRiskScore;

  return (
    <div className="space-y-8 pb-10">
      {/* ── Metrics ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NewsMetric
          label="Stories"
          value={String(metrics.total)}
          hint="Total items currently in the feed"
          icon={<BarChart2 className="size-4" />}
          glowColor="hsl(199 89% 48%)"
        />
        <NewsMetric
          label="Positive"
          value={String(metrics.positive)}
          hint="Stories marked as positive"
          icon={<TrendingUp className="size-4" />}
          glowColor="hsl(152 69% 42%)"
        />
        <NewsMetric
          label="Mixed"
          value={String(metrics.mixed)}
          hint="Stories marked as mixed"
          icon={<Sparkles className="size-4" />}
          glowColor="hsl(42 95% 50%)"
        />
        <NewsMetric
          label="Negative"
          value={String(metrics.negative)}
          hint="Stories marked as negative"
          icon={<TrendingDown className="size-4" />}
          glowColor="hsl(0 72% 51%)"
        />
      </section>

      {/* ── Search + Tone filters ── */}
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Filter and search</p>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search titles and summaries"
              className="h-12 rounded-[1.25rem] pl-11 text-base"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {(["all", "positive", "neutral", "mixed", "negative"] as const).map((tone) => (
            <Button
              key={tone}
              variant={toneFilter === tone ? "default" : "outline"}
              onClick={() => {
                setToneFilter(tone);
                setPagination((current) =>
                  current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
                );
              }}
              className="rounded-full px-4"
            >
              {tone === "all" ? "All stories" : sentimentToneLabels[tone]}
            </Button>
          ))}
        </div>
      </section>

      {/* ── Analysis type filter ── */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Analysis</span>
        {(["all", "quick", "comprehensive"] as const).map((analysisType) => (
          <Button
            key={analysisType}
            variant={analysisFilter === analysisType ? "default" : "outline"}
            onClick={() => {
              setAnalysisFilter(analysisType);
              setPagination((current) =>
                current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
              );
            }}
            className="rounded-full px-4 capitalize"
          >
            {analysisType === "all" ? "All analyses" : analysisType}
          </Button>
        ))}
      </section>

      {/* ── Source filters ── */}
      {sourceOptions.length > 0 && (
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Source</span>
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            onClick={() => {
              setSourceFilter("all");
              setPagination((current) =>
                current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
              );
            }}
            className="rounded-full px-4"
          >
            All
          </Button>
          {sourceOptions.map((src) => (
            <Button
              key={src}
              variant={sourceFilter === src ? "default" : "outline"}
              onClick={() => {
                setSourceFilter(src);
                setPagination((current) =>
                  current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
                );
              }}
              className="rounded-full px-4"
            >
              {src}
            </Button>
          ))}
        </section>
      )}

      {/* ── News table ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">News feed</h2>
            <p className="text-sm text-muted-foreground">
              Title and link first, then a details dialog for the rest.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Add new story
          </Button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{table.getRowModel().rows.length}</span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {newsQuery.data?.meta?.total ?? items.length}
            </span>
          </p>
        </div>

        <div className="overflow-hidden rounded-4xl border border-border/70 bg-background/80 shadow-lg">
          {newsQuery.isLoading ? (
            <div className="divide-y divide-border/60">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.8fr)_auto] md:items-center"
                >
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted" />
                  <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : newsQuery.isError ? (
            <Empty className="border-0 py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                  <AlertTriangle />
                </EmptyMedia>
                <EmptyTitle>Could not load the feed</EmptyTitle>
                <EmptyDescription>
                  {(newsQuery.error as InsightApiError | undefined)?.message ??
                    "Check the API URL and authentication token, then try again."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => newsQuery.refetch()}>Retry request</Button>
              </EmptyContent>
            </Empty>
          ) : table.getRowModel().rows.length === 0 ? (
            <Empty className="border-0 py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles />
                </EmptyMedia>
                <EmptyTitle>No news items yet</EmptyTitle>
                <EmptyDescription>
                  Use the create dialog to add the first story, or wait for n8n to push a fresh RSS
                  item into the API.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={openCreateDialog}>
                  <Plus className="size-4" />
                  Add first story
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex flex-col">
              <Table style={{ tableLayout: "fixed", width: "100%" }}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="border-b border-border/50 bg-muted/50 hover:bg-muted/50"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{
                            width: header.getSize() === 9999 ? undefined : header.getSize(),
                          }}
                          className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group border-b border-border/40 transition-colors hover:bg-muted/30"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{
                            width:
                              cell.column.getSize() === 9999 ? undefined : cell.column.getSize(),
                          }}
                          className="px-5 py-4 align-middle whitespace-normal"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {Math.max(table.getPageCount(), 1)}
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronRight className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={editorOpen} onOpenChange={handleEditorOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "create" ? "Add news item" : "Edit news item"}
            </DialogTitle>
            <DialogDescription>
              Capture the title and link first, then attach the sentiment object and guidance text.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitForm} className="space-y-6">
            {editorMode === "create" ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Analysis mode</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "quick",
                          title: "Quick analysis",
                          description: "Run once and return the latest sentiment report.",
                        },
                        {
                          value: "comprehensive",
                          title: "Comprehensive analysis",
                          description: "Track changes across repeated analysis rounds.",
                        },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({ ...current, analysis_type: mode.value }))
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          form.analysis_type === mode.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/15"
                            : "border-border/70 hover:border-primary/40"
                        }`}
                      >
                        <span className="font-semibold">{mode.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {mode.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  {form.analysis_type === "comprehensive" && (
                    <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
                      <div className="space-y-2">
                        <Label htmlFor="track-days">Tracking duration (days)</Label>
                        <Input
                          id="track-days"
                          type="number"
                          min="1"
                          max="14"
                          value={form.track_days}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, track_days: event.target.value }))
                          }
                          required
                        />
                        <p className="text-xs text-muted-foreground">Maximum of 14 days.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Round interval</Label>
                        <div className="flex flex-wrap gap-2">
                          {comprehensiveIntervalOptions.map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              size="sm"
                              variant={
                                Number(form.interval_minutes) === option.value
                                  ? "default"
                                  : "outline"
                              }
                              className="rounded-full"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  interval_minutes: String(option.value),
                                }))
                              }
                            >
                              {option.label}
                              {option.value === 180 ? " (default)" : ""}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A new round starts every{" "}
                          {formatIntervalLabel(Number(form.interval_minutes))}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Label>Add links (Optional comment limit)</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter each Facebook link. Optionally, specify a total comment count limit;
                    otherwise, the count and reactions will be derived automatically from the
                    scrape.
                  </p>
                  <div className="space-y-3">
                    {form.linkEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3"
                      >
                        <div className="flex gap-3 items-center">
                          <div className="flex-1">
                            <Input
                              type="url"
                              placeholder="Enter link or hostname"
                              value={entry.url}
                              onChange={(e) =>
                                setForm((current) => ({
                                  ...current,
                                  linkEntries: current.linkEntries.map((item) =>
                                    item.id === entry.id ? { ...item, url: e.target.value } : item,
                                  ),
                                }))
                              }
                              className="rounded-xl bg-input/50 text-base h-10"
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Limit (optional)"
                              value={entry.totalComments}
                              onChange={(e) =>
                                setForm((current) => ({
                                  ...current,
                                  linkEntries: current.linkEntries.map((item) =>
                                    item.id === entry.id
                                      ? { ...item, totalComments: e.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              className="rounded-xl bg-input/50 text-base h-10"
                            />
                          </div>
                          <div className="w-16 text-center shrink-0">
                            {entry.totalComments && Number(entry.totalComments) > 0 ? (
                              <div>
                                <p className="text-[10px] text-muted-foreground leading-none">
                                  Sample
                                </p>
                                <p className="text-base font-bold text-primary">
                                  {calculateCommentCount(Number(entry.totalComments))}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Auto</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-10 w-10 p-0 shrink-0"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                linkEntries: current.linkEntries.filter(
                                  (item) => item.id !== entry.id,
                                ),
                              }))
                            }
                            disabled={form.linkEntries.length === 1}
                          >
                            <Trash className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full w-full"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        linkEntries: [
                          ...current.linkEntries,
                          { id: Date.now().toString(), url: "", totalComments: "", source: "" },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-4 mr-2" />
                    Add another link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Textarea
                    id="title"
                    placeholder="Breaking News: Market Reaction"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    rows={3}
                    className="rounded-3xl bg-input/50 text-base leading-6"
                    required={editorMode === "edit"}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="link">Link</Label>
                  <Input
                    id="link"
                    type="url"
                    value={form.link}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, link: event.target.value }))
                    }
                    placeholder="https://example.com/article"
                    required={editorMode === "edit"}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-source" className="flex items-center gap-2">
                    Source
                    <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="edit-source"
                    type="text"
                    placeholder="e.g. Facebook, Twitter, Reuters"
                    value={form.source}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, source: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={form.summary}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, summary: event.target.value }))
                    }
                    placeholder="Short editorial summary of the story."
                    rows={5}
                    required={editorMode === "edit"}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="themes">Main themes</Label>
                  <Input
                    id="themes"
                    value={form.main_themes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, main_themes: event.target.value }))
                    }
                    placeholder="technology, startup, regulation"
                    required={editorMode === "edit"}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reco_action">Recommended action</Label>
                  <Textarea
                    id="reco_action"
                    value={form.reco_action}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, reco_action: event.target.value }))
                    }
                    placeholder="Monitor this trend and escalate if risk increases."
                    rows={3}
                    required={editorMode === "edit"}
                  />
                </div>
              </div>
            )}

            {editorMode === "edit" && (
              <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Sentiment payload</p>
                    <p className="text-sm text-muted-foreground">
                      These fields map directly to the JSON sentiment object.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full capitalize">
                    {form.overall_sentiment}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="overall_sentiment">Overall sentiment</Label>
                    <select
                      id="overall_sentiment"
                      value={form.overall_sentiment}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          overall_sentiment: event.target.value as SentimentTone,
                        }))
                      }
                      className="h-12 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="risk_level">Risk level</Label>
                    <Input
                      id="risk_level"
                      value={form.risk_level}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, risk_level: event.target.value }))
                      }
                      placeholder="2/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="positive">Positive</Label>
                    <Input
                      id="positive"
                      value={form.positive}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, positive: event.target.value }))
                      }
                      placeholder="75%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="negative">Negative</Label>
                    <Input
                      id="negative"
                      value={form.negative}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, negative: event.target.value }))
                      }
                      placeholder="15%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neutral">Neutral</Label>
                    <Input
                      id="neutral"
                      value={form.neutral}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, neutral: event.target.value }))
                      }
                      placeholder="10%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mixed">Mixed</Label>
                    <Input
                      id="mixed"
                      value={form.mixed}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, mixed: event.target.value }))
                      }
                      placeholder="10%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_comments">Total comments</Label>
                    <Input
                      id="total_comments"
                      type="number"
                      min="0"
                      value={form.total_comments}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          total_comments: event.target.value,
                        }))
                      }
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editorMode === "create" ? (
                  <Plus className="size-4" />
                ) : (
                  <PenLine className="size-4" />
                )}
                {editorMode === "create" ? "Create story" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Details Dialog ── */}
      <Dialog
        open={Boolean(sentimentTarget)}
        onOpenChange={(open) => !open && setSentimentTarget(null)}
      >
        <DialogContent className="sm:max-w-5xl p-6">
          {sentimentTarget && (
            <div className="flex flex-col gap-6">
              <DialogHeader className="shrink-0 pr-8">
                <DialogTitle className="wrap-break-word leading-snug">
                  {sentimentTarget.title}
                </DialogTitle>
                <DialogDescription>
                  Full story details, sentiment, and editorial action.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      sentimentToneStyles[
                        getSentimentTone(sentimentTarget.sentiment?.overall_sentiment)
                      ]
                    }
                  >
                    {
                      sentimentToneLabels[
                        getSentimentTone(sentimentTarget.sentiment?.overall_sentiment)
                      ]
                    }
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    Risk {formatRiskValue(sentimentTarget.sentiment?.risk_level)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {String(sentimentTarget.sentiment?.total_comments ?? 0)} comments
                  </Badge>
                  <Badge variant="outline" className="rounded-full capitalize">
                    {sentimentTarget.analysis_type ?? "quick"} analysis
                  </Badge>
                  {sentimentTarget.analysis_type === "comprehensive" &&
                  sentimentTarget.monitoring_status === "stopped" ? (
                    <Badge variant="secondary" className="rounded-full">
                      Monitoring stopped
                    </Badge>
                  ) : null}
                  <a
                    href={sentimentTarget.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-primary transition hover:bg-muted"
                  >
                    <ExternalLink className="size-3.5" />
                    Open source link
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {(
                    [
                      {
                        label: "Positive",
                        value: sentimentTarget.sentiment?.positive ?? "-",
                        color: "text-emerald-600",
                      },
                      {
                        label: "Negative",
                        value: sentimentTarget.sentiment?.negative ?? "-",
                        color: "text-rose-600",
                      },
                      {
                        label: "Neutral",
                        value: sentimentTarget.sentiment?.neutral ?? "-",
                        color: "text-slate-700",
                      },
                      {
                        label: "Mixed",
                        value: sentimentTarget.sentiment?.mixed ?? "-",
                        color: "text-amber-600",
                      },
                    ] as const
                  ).map(({ label, value, color }) => (
                    <div key={label} className="rounded-3xl border border-border/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {label}
                      </p>
                      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {sentimentTarget.analysis_type === "comprehensive" && (
                  <section className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 font-semibold">
                          <Activity className="size-4 text-primary" /> Sentiment trend
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Changes across {sentimentTarget.track_days ?? 3} days of analysis.
                        </p>
                      </div>
                      {snapshotsQuery.data?.data.length ? (
                        <Badge variant="secondary">
                          {formatRoundCount(snapshotsQuery.data.data.length)}
                        </Badge>
                      ) : null}
                    </div>
                    {!snapshotsQuery.isLoading && !snapshotsQuery.isError ? (
                      <NextRoundSchedule
                        news={sentimentTarget}
                        latestSnapshot={snapshotsQuery.data?.data.at(-1)}
                      />
                    ) : null}
                    {snapshotsQuery.isLoading ? (
                      <div className="flex h-40 items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" /> Loading snapshots
                      </div>
                    ) : snapshotsQuery.isError ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        Snapshot history could not be loaded.
                      </div>
                    ) : snapshotsQuery.data?.data.length ? (
                      <div className="space-y-6">
                        <SnapshotTrendChart snapshots={snapshotsQuery.data.data} />
                        <div className="border-t border-border/70 pt-5">
                          <div className="mb-3">
                            <h3 className="flex items-center gap-2 font-semibold">
                              <BarChart2 className="size-4 text-violet-600" /> Reaction trend
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Total growth and reaction mix captured at each round.
                            </p>
                          </div>
                          <ReactionTrendChart snapshots={snapshotsQuery.data.data} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Waiting for the first comprehensive-analysis snapshot.
                      </div>
                    )}
                  </section>
                )}

                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="detail-title">Title</Label>
                      <Input
                        id="detail-title"
                        value={sentimentTarget.title}
                        readOnly
                        className="h-12 rounded-3xl bg-muted/40 text-base font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-summary">Summary</Label>
                      <Textarea
                        id="detail-summary"
                        value={sentimentTarget.summary || "No summary provided."}
                        readOnly
                        rows={8}
                        className="rounded-3xl bg-muted/40 leading-6"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detail-reco">Recommended action</Label>
                      <Textarea
                        id="detail-reco"
                        value={sentimentTarget.reco_action || "No recommendation provided."}
                        readOnly
                        rows={5}
                        className="rounded-3xl bg-muted/40 leading-6"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Main themes</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(sentimentTarget.main_themes ?? []).map((theme) => (
                          <Badge key={theme} variant="outline" className="rounded-full">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {sentimentTarget.sentiment && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => setShowAdvancedReport(!showAdvancedReport)}
                          className="w-full rounded-2xl flex items-center justify-between px-4 py-2 border-border/70 hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold text-sm">
                            {showAdvancedReport ? "Hide Analysis Report" : "Show Analysis Report"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {showAdvancedReport ? "▲" : "▼"}
                          </span>
                        </Button>

                        {showAdvancedReport && (
                          <div
                            data-report-id={sentimentTarget.sentiment.report_id}
                            className="mt-4 rounded-3xl border border-border/60 bg-card p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
                          >
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                              {sentimentTarget.sentiment.reaction_tone && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Reaction Tone
                                  </p>
                                  <Badge className="rounded-full font-medium capitalize">
                                    {sentimentTarget.sentiment.reaction_tone}
                                  </Badge>
                                </div>
                              )}
                              {sentimentTarget.sentiment.signal_alignment && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Signal Alignment
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full font-medium capitalize"
                                  >
                                    {sentimentTarget.sentiment.signal_alignment}
                                  </Badge>
                                </div>
                              )}
                              {sentimentTarget.sentiment.dominant_reaction && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Dominant Reaction
                                  </p>
                                  <span className="text-sm font-semibold capitalize text-foreground">
                                    {sentimentTarget.sentiment.dominant_reaction}
                                    {sentimentTarget.sentiment.dominant_reaction_percentage !==
                                      undefined && (
                                      <span className="ml-1 text-xs text-muted-foreground">
                                        ({sentimentTarget.sentiment.dominant_reaction_percentage}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {sentimentTarget.sentiment.reaction_data_consistent !== undefined && (
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                    Data Consistent
                                  </p>
                                  <span className="text-sm font-semibold flex items-center gap-1.5">
                                    {sentimentTarget.sentiment.reaction_data_consistent ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="size-3.5" /> Consistent
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                        <AlertTriangle className="size-3.5" /> Inconsistent
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>

                            {sentimentTarget.sentiment.reaction_summary && (
                              <div className="space-y-1.5 rounded-2xl bg-muted/30 p-3.5 border border-border/40">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                  Reaction Summary
                                </p>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                  "{sentimentTarget.sentiment.reaction_summary}"
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Record info
                    </p>
                    <div className="mt-3 space-y-3 text-sm">
                      {(
                        [
                          { label: "User ID", value: String(sentimentTarget.user_id) },
                          { label: "Created", value: formatDate(sentimentTarget.created_at) },
                          { label: "Updated", value: formatDate(sentimentTarget.updated_at) },
                          {
                            label: "Risk level",
                            value: formatRiskValue(sentimentTarget.sentiment?.risk_level),
                          },
                          {
                            label: "Total comments",
                            value: String(
                              sentimentTarget.sentiment?.total_comments ??
                                sentimentTarget.comment_count ??
                                0,
                            ),
                          },
                          {
                            label: "Reaction count",
                            value:
                              sentimentTarget.reaction_count !== null &&
                              sentimentTarget.reaction_count !== undefined
                                ? String(sentimentTarget.reaction_count)
                                : "-",
                          },
                          {
                            label: "View count",
                            value:
                              sentimentTarget.view_count !== null &&
                              sentimentTarget.view_count !== undefined
                                ? String(sentimentTarget.view_count)
                                : "-",
                          },
                        ] as const
                      ).map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}

                      {sentimentTarget.reactions &&
                        Object.keys(sentimentTarget.reactions).length > 0 && (
                          <div className="border-t border-border/70 pt-3 mt-3 space-y-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              Reactions Breakdown
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              {Object.entries(sentimentTarget.reactions).map(
                                ([reaction, count]) => (
                                  <div key={reaction} className="flex justify-between">
                                    <span className="capitalize">{reaction}</span>
                                    <span>{count}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 sm:items-center">
                <Button variant="outline" type="button" onClick={() => setSentimentTarget(null)}>
                  Close
                </Button>
                {sentimentTarget.analysis_type === "comprehensive" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={exportingFormat !== null}
                      render={<Button variant="outline" type="button" />}
                    >
                      {exportingFormat ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Export
                      <ChevronDown className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-52">
                      <DropdownMenuItem
                        className="min-h-9"
                        onClick={() => void downloadComprehensiveExport(sentimentTarget, "xlsx")}
                      >
                        <FileSpreadsheet className="text-emerald-600" />
                        Export Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-9"
                        onClick={() => void downloadComprehensiveExport(sentimentTarget, "csv")}
                      >
                        <FileText className="text-sky-600" />
                        Export CSV (.csv)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => openEditorFromDetails(sentimentTarget)}
                >
                  Edit story
                </Button>
                {isMonitoringOngoing(sentimentTarget) ? (
                  <Button
                    variant="outline"
                    type="button"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => setStopTarget(sentimentTarget)}
                  >
                    <Square className="size-3.5 fill-current" />
                    Stop monitoring
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  type="button"
                  onClick={() => {
                    setDeleteTarget(sentimentTarget);
                    setSentimentTarget(null);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete story
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          {deleteTarget && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this news item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes{" "}
                  <span className="font-medium text-foreground">{deleteTarget.title}</span> from the
                  dashboard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Delete story"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(stopTarget)} onOpenChange={(open) => !open && setStopTarget(null)}>
        <AlertDialogContent>
          {stopTarget ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop comprehensive monitoring?</AlertDialogTitle>
                <AlertDialogDescription>
                  No new rounds will be scheduled for{" "}
                  <span className="font-medium text-foreground">{stopTarget.title}</span>. Existing
                  sentiment and reaction history will remain available. This action cannot be
                  resumed yet.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={stopMonitoringMutation.isPending}>
                  Keep monitoring
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={stopMonitoringMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    stopMonitoringMutation.mutate(stopTarget.id);
                  }}
                >
                  {stopMonitoringMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Square className="size-3.5 fill-current" />
                  )}
                  Stop monitoring
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Quick Export Dialog ── */}
      <ExportDialog news={exportTarget} onClose={() => setExportTarget(null)} />
    </div>
  );
}
