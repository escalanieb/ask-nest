import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { insightFetch, type InsightApiError } from "@/services/insightApi";
import type { NewsItem, PaginatedNewsResponse, Sentiment } from "@/types/insight";

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
};

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

type CreateSingleLinkPayload = {
  link: string;
  comment_count?: number | null;
};
type CreateBulkLinksPayload = {
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
type CreateNewsPayload =
  | CreateSingleLinkPayload
  | CreateBulkLinksPayload
  | FullNewsPayload;

function toFormState(item?: NewsItem | null): NewsFormState {
  if (!item) return emptyFormState;
  return {
    title: item.title ?? "",
    link: item.link ?? "",
    source: item.source ?? "",
    linkEntries: [],
    summary: item.summary ?? "",
    reco_action: item.reco_action ?? "",
    main_themes: Array.isArray(item.main_themes)
      ? item.main_themes.join(", ")
      : "",
    overall_sentiment:
      (item.sentiment?.overall_sentiment as SentimentTone) || "neutral",
    positive: item.sentiment?.positive ?? "",
    negative: item.sentiment?.negative ?? "",
    neutral: item.sentiment?.neutral ?? "",
    mixed: item.sentiment?.mixed ?? "",
    risk_level: item.sentiment?.risk_level ?? "",
    total_comments: String(item.sentiment?.total_comments ?? 0),
  };
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

function parseThemes(value: string) {
  return value
    .split(",")
    .map((theme) => theme.trim())
    .filter(Boolean);
}

function getSentimentTone(value?: string | null): SentimentTone {
  if (
    value === "positive" ||
    value === "negative" ||
    value === "neutral" ||
    value === "mixed"
  ) {
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
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [sentimentTarget, setSentimentTarget] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsFormState>(emptyFormState);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showAdvancedReport, setShowAdvancedReport] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setSearch(nextValue);
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
      );
    },
    []
  );

  const newsQuery = useQuery({
    queryKey: ["insight-news", deferredSearch, pagination.pageIndex, pagination.pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        per_page: String(pagination.pageSize),
      });
      const endpoint = deferredSearch
        ? `/news/search?q=${encodeURIComponent(deferredSearch)}&${params.toString()}`
        : `/news?${params.toString()}`;
      return insightFetch<PaginatedNewsResponse>(endpoint);
    },
    placeholderData: keepPreviousData,
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
    mutationFn: async (id: number) =>
      insightFetch<{ message: string }>(`/news/${id}`, "DELETE"),
    onSuccess: async () => {
      toast.success("News item deleted successfully");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["insight-news"] });
    },
    onError: (error: InsightApiError) => {
      toast.error(error.message || "Failed to delete news item");
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
        toneFilter === "all" ||
        getSentimentTone(item.sentiment?.overall_sentiment) === toneFilter;
      const sourceMatch =
        sourceFilter === "all" || (item.source ?? "") === sourceFilter;
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

  const openEditorFromDetails = useCallback(
    (item: NewsItem) => {
      setSentimentTarget(null);
      openEditDialog(item);
    },
    [openEditDialog]
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
          const tone = getSentimentTone(
            info.row.original.sentiment?.overall_sentiment
          );
          return (
            <div className="min-w-0 space-y-2">
              <p className="overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] font-medium leading-6 text-foreground">
                {info.getValue()}
              </p>
              {info.row.original.sentiment && (
                <Badge
                  className={`w-fit rounded-full text-xs ${sentimentToneStyles[tone]}`}
                >
                  {sentimentToneLabels[tone]}
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 120,
        minSize: 100,
        maxSize: 140,
        cell: (info) => (
          <StatusBadge status={getScrapingStatus(info.getValue())} />
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
          </div>
        ),
      }),
    ],
    [openDetailsDialog]
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
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "positive"
    ).length;
    const neutral = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "neutral"
    ).length;
    const negative = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "negative"
    ).length;
    const mixed = items.filter(
      (item) => getSentimentTone(item.sentiment?.overall_sentiment) === "mixed"
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
            }
          : {
              links: validEntries.map((e) => ({
                link: e.url,
                comment_count: e.commentCount,
              })),
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
                  current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
                );
              }}
              className="rounded-full px-4"
            >
              {tone === "all" ? "All stories" : sentimentToneLabels[tone]}
            </Button>
          ))}
        </div>
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
                current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
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
                  current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
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
            <span className="font-medium text-foreground">
              {table.getRowModel().rows.length}
            </span>{" "}
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
                  Use the create dialog to add the first story, or wait for n8n to push a
                  fresh RSS item into the API.
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
                              cell.column.getSize() === 9999
                                ? undefined
                                : cell.column.getSize(),
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
              Capture the title and link first, then attach the sentiment object and guidance
              text.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitForm} className="space-y-6">
            {editorMode === "create" ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Add links (Optional comment limit)</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter each Facebook link. Optionally, specify a total comment count limit;
                    otherwise, the count and reactions will be derived automatically from the scrape.
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
                                    item.id === entry.id
                                      ? { ...item, url: e.target.value }
                                      : item
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
                                      : item
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
                                  (item) => item.id !== entry.id
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
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
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
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reaction Tone</p>
                                  <Badge className="rounded-full font-medium capitalize">
                                    {sentimentTarget.sentiment.reaction_tone}
                                  </Badge>
                                </div>
                              )}
                              {sentimentTarget.sentiment.signal_alignment && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Signal Alignment</p>
                                  <Badge variant="secondary" className="rounded-full font-medium capitalize">
                                    {sentimentTarget.sentiment.signal_alignment}
                                  </Badge>
                                </div>
                              )}
                              {sentimentTarget.sentiment.dominant_reaction && (
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dominant Reaction</p>
                                  <span className="text-sm font-semibold capitalize text-foreground">
                                    {sentimentTarget.sentiment.dominant_reaction} 
                                    {sentimentTarget.sentiment.dominant_reaction_percentage !== undefined && (
                                      <span className="ml-1 text-xs text-muted-foreground">({sentimentTarget.sentiment.dominant_reaction_percentage}%)</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {sentimentTarget.sentiment.reaction_data_consistent !== undefined && (
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Data Consistent</p>
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
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reaction Summary</p>
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
                            value: String(sentimentTarget.sentiment?.total_comments ?? sentimentTarget.comment_count ?? 0),
                          },
                          {
                            label: "Reaction count",
                            value: sentimentTarget.reaction_count !== null && sentimentTarget.reaction_count !== undefined ? String(sentimentTarget.reaction_count) : "-",
                          },
                          {
                            label: "View count",
                            value: sentimentTarget.view_count !== null && sentimentTarget.view_count !== undefined ? String(sentimentTarget.view_count) : "-",
                          },
                        ] as const
                      ).map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}

                      {sentimentTarget.reactions && Object.keys(sentimentTarget.reactions).length > 0 && (
                        <div className="border-t border-border/70 pt-3 mt-3 space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            Reactions Breakdown
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            {Object.entries(sentimentTarget.reactions).map(([reaction, count]) => (
                              <div key={reaction} className="flex justify-between">
                                <span className="capitalize">{reaction}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 sm:items-center">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSentimentTarget(null)}
                >
                  Close
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => openEditorFromDetails(sentimentTarget)}
                >
                  Edit story
                </Button>
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
                  <span className="font-medium text-foreground">{deleteTarget.title}</span>{" "}
                  from the dashboard.
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
    </div>
  );
}
