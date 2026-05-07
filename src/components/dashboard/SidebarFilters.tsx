import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { psgcApi, type PsgcCityMunicipality } from "../../services/api/psgcApi";
import { rssFeedApi, type RssFeed } from "../../services/api/rssFeedApi";
import { fetchDatasets } from "../../services/api/datasetApi";
import { disasterApi } from "../../services/api/disasterApi";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore, type MapAreaLevel } from "../../stores/useMapStore";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useRssStore } from "../../stores/useRssStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useDisasterStore } from "../../stores/useDisasterStore";
import { useElectionCountdown } from "../../hooks/useElectionCountdown";
import { useVideoStore, type VideoPlatform } from "../../stores/useVideoStore";

// ---------------------------------------------------------------------------
// Accordion section wrapper
// ---------------------------------------------------------------------------
function AccordionSection({
  title,
  defaultOpen = true,
  headerClassName,
  titleClassName,
  chevronClassName,
  action,
  contentClassName,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  headerClassName?: string;
  titleClassName?: string;
  chevronClassName?: string;
  action?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="shrink-0 border-b border-slate-200">
      <div
        className={`flex w-full items-center gap-2 px-4 py-2.5 transition-colors ${
          headerClassName ?? "bg-white hover:bg-slate-50"
        }`}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span
            className={`flex-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
              titleClassName ?? "text-slate-400"
            }`}
          >
            {title}
          </span>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            } ${chevronClassName ?? "text-slate-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {action}
      </div>
      {open && (
        <div className={contentClassName ?? "px-4 pb-3"}>{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------
function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}

function ElectionCountdown() {
  const { months, weeks, days, hours, minutes, seconds, isPast } =
    useElectionCountdown();

  return (
    <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-red-700 via-red-600 to-rose-600 px-5 py-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-red-200 mb-0.5">
            Countdown to
          </p>
          <h2 className="text-base font-bold text-white leading-tight">
            PH Elections 2028
          </h2>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80 ring-1 ring-white/20">
          LIVE
        </span>
      </div>

      {isPast ? (
        <p className="text-xl font-bold text-white">Election Day!</p>
      ) : (
        <>
          {/* Primary row: months / weeks / days */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { v: months, l: "Months" },
              { v: weeks, l: "Weeks" },
              { v: days, l: "Days" },
            ].map(({ v, l }) => (
              <div
                key={l}
                className="flex flex-col items-center rounded-xl bg-white/10 py-3 ring-1 ring-white/10"
              >
                <span className="text-3xl font-bold tabular-nums text-white leading-none">
                  {pad(v)}
                </span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-red-200">
                  {l}
                </span>
              </div>
            ))}
          </div>

          {/* Secondary row: hours / minutes / seconds */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: hours, l: "Hours" },
              { v: minutes, l: "Minutes" },
              { v: seconds, l: "Seconds" },
            ].map(({ v, l }) => (
              <div
                key={l}
                className="flex flex-col items-center rounded-lg bg-white/5 py-1.5 ring-1 ring-white/5"
              >
                <span className="text-lg font-bold tabular-nums text-white/90 leading-none">
                  {pad(v)}
                </span>
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-red-300">
                  {l}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map Area Level Toggle
// ---------------------------------------------------------------------------
const MAP_AREA_LEVELS: { id: MapAreaLevel; label: string }[] = [
  { id: "region", label: "Region" },
  { id: "province", label: "Province" },
  { id: "municity", label: "Municities" },
];

function MapAreaToggle() {
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);
  const setMapAreaLevel = useMapStore((s) => s.setMapAreaLevel);
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const setActiveProvince = useFilterStore((s) => s.setActiveProvince);

  function handleChange(level: MapAreaLevel) {
    if (level === mapAreaLevel) return;
    setMapAreaLevel(level);
    setSelectedLocation(null);
    // Clear sub-region filters but keep activeRegion so municity/province
    // can immediately load for the already-selected region.
    setActiveProvince(null); // also cascades to clear activeCityMuni
  }

  return (
    <AccordionSection title="Map Areas">
      <div className="space-y-2 pt-1">
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          {MAP_AREA_LEVELS.map(({ id, label }, i) => (
            <button
              key={id}
              onClick={() => handleChange(id)}
              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                i > 0 ? "border-l border-slate-200" : ""
              } ${
                mapAreaLevel === id
                  ? "bg-red-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-500">Note:</span> Province
          and Municity GeoJSON files are larger (~10–30 MB). Province loads
          quickly; Municities may take a few seconds on first load.
        </p>
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// RSS Feed Settings (sidebar section)
// ---------------------------------------------------------------------------
function RssFeedSettings() {
  const activeFeedId = useRssStore((s) => s.activeFeedId);
  const setActiveFeedId = useRssStore((s) => s.setActiveFeedId);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("General");
  const [addError, setAddError] = useState<string | null>(null);

  const {
    data: feeds = [],
    isLoading,
    isError,
  } = useQuery<RssFeed[]>({
    queryKey: ["rss-feeds"],
    queryFn: rssFeedApi.list,
    staleTime: 1000 * 60 * 5,
  });

  // Auto-select first feed when list loads
  useEffect(() => {
    if (!activeFeedId && feeds.length > 0) {
      setActiveFeedId(feeds[0].id);
    }
  }, [feeds, activeFeedId, setActiveFeedId]);

  const addMutation = useMutation({
    mutationFn: () => rssFeedApi.create({ name, url, category }),
    onSuccess: (newFeed) => {
      qc.invalidateQueries({ queryKey: ["rss-feeds"] });
      setActiveFeedId(newFeed.id);
      setShowAdd(false);
      setName("");
      setUrl("");
      setCategory("General");
      setAddError(null);
    },
    onError: () => setAddError("Failed to add feed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rssFeedApi.remove(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["rss-feeds"] });
      if (activeFeedId === id) setActiveFeedId(null);
    },
  });

  return (
    <AccordionSection title="RSS Feeds" defaultOpen={false}>
      <div className="space-y-1 pt-1">
        {isLoading && (
          <p className="py-1 text-[10px] text-slate-400">Loading feeds…</p>
        )}
        {isError && (
          <p className="py-1 text-[10px] text-red-400">Failed to load feeds.</p>
        )}

        {feeds.map((feed) => (
          <div key={feed.id} className="flex items-center gap-1">
            <button
              onClick={() => setActiveFeedId(feed.id)}
              className={`flex min-w-0 flex-1 flex-col rounded-lg px-2.5 py-1.5 text-left transition-all ${
                activeFeedId === feed.id
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold">
                {feed.name}
              </span>
              {feed.category && (
                <span
                  className={`text-[9px] ${
                    activeFeedId === feed.id ? "text-red-200" : "text-slate-400"
                  }`}
                >
                  {feed.category}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  if (confirm(`Remove "${feed.name}"?`))
                    deleteMutation.mutate(feed.id);
                }}
                className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:text-red-500"
                title="Remove feed"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {isAdmin && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-[10px] text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
          >
            + Add Feed
          </button>
        )}

        {isAdmin && showAdd && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              New Feed
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-red-400"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed"
              type="url"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-red-400"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-red-400"
            />
            {addError && <p className="text-[9px] text-red-500">{addError}</p>}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setAddError(null);
                }}
                className="flex-1 rounded border border-slate-200 bg-white py-1 text-[10px] text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setAddError(null);
                  if (!name.trim() || !url.trim()) {
                    setAddError("Name and URL are required.");
                    return;
                  }
                  addMutation.mutate();
                }}
                disabled={addMutation.isPending}
                className="flex-1 rounded bg-red-600 py-1 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {addMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Helpers shared with VideoPanel
// ---------------------------------------------------------------------------
function detectVideoPlatform(url: string): VideoPlatform | null {
  if (/youtu\.be|youtube\.com/.test(url)) return "youtube";
  if (/facebook\.com|fb\.watch/.test(url)) return "facebook";
  return null;
}

// ---------------------------------------------------------------------------
// Video Link Manager
// ---------------------------------------------------------------------------
function VideoLinkManager() {
  const { savedLinks, addLink, removeLink, setPendingSource } = useVideoStore();

  const [showAdd, setShowAdd] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  function handleSave() {
    const name = linkName.trim();
    const raw = linkUrl.trim();
    if (!name || !raw) {
      setAddError("Name and embed code are required.");
      return;
    }

    // Extract src from <iframe> embed code or treat as a plain embed src
    let src = raw;
    if (raw.startsWith("<")) {
      const m = raw.match(/\bsrc=["']([^"']+)["']/i);
      if (!m) {
        setAddError("Could not find src in the embed code.");
        return;
      }
      src = m[1];
    }

    const platform = detectVideoPlatform(src);
    if (!platform) {
      setAddError("Paste a YouTube or Facebook <iframe> embed code.");
      return;
    }
    addLink({ name, url: src, platform });
    setLinkName("");
    setLinkUrl("");
    setAddError(null);
    setShowAdd(false);
  }

  return (
    <AccordionSection title="Video Links" defaultOpen={false}>
      <div className="space-y-1 pt-1">
        {savedLinks.length === 0 && !showAdd && (
          <p className="py-1 text-[10px] text-slate-400">No saved links yet.</p>
        )}

        {savedLinks.map((link) => (
          <div key={link.id} className="flex items-center gap-1">
            <button
              onClick={() =>
                setPendingSource({
                  url: link.url,
                  platform: link.platform,
                  name: link.name,
                })
              }
              className="flex min-w-0 flex-1 flex-col rounded-lg bg-slate-100 px-2.5 py-1.5 text-left transition-all hover:bg-slate-200"
            >
              <span className="block truncate text-[11px] font-semibold text-slate-700">
                {link.name}
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                {link.platform === "youtube" ? "YouTube" : "Facebook"}
              </span>
            </button>
            <button
              onClick={() => removeLink(link.id)}
              className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:text-red-500"
              title="Remove link"
            >
              ×
            </button>
          </div>
        ))}

        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-[10px] text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
          >
            + Save Link
          </button>
        )}

        {showAdd && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              New Video Link
            </p>
            <input
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              placeholder="Name (e.g. CNN Live)"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-red-400"
            />
            <textarea
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={"Paste <iframe> embed code\n(YouTube or Facebook)"}
              rows={3}
              className="w-full resize-none rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:border-red-400"
            />
            {addError && <p className="text-[9px] text-red-500">{addError}</p>}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setAddError(null);
                }}
                className="flex-1 rounded border border-slate-200 bg-white py-1 text-[10px] text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded bg-red-600 py-1 text-[10px] font-semibold text-white hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Widget toggles
// ---------------------------------------------------------------------------
const WIDGETS = [
  {
    id: "analyticsPanel",
    label: "Analytics",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: "rssFeedPanel",
    label: "RSS Feeds",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z"
        />
      </svg>
    ),
  },
  {
    id: "recordsPanel",
    label: "Records",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "videoPanel",
    label: "Video",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "disasterPanel",
    label: "Disasters",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },
] as const;

function WidgetToggles() {
  const widgets = useWorkspaceStore((s) => s.widgets);
  const toggleWidget = useWorkspaceStore((s) => s.toggleWidget);

  return (
    <AccordionSection title="Panels">
      <div className="flex flex-wrap gap-2 pt-1">
        {WIDGETS.map(({ id, label, icon }) => {
          const active = widgets[id]?.visible ?? false;
          return (
            <button
              key={id}
              onClick={() => toggleWidget(id)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-red-300 bg-red-600 text-white hover:bg-red-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {icon}
              {label}
              <span
                className={`ml-0.5 h-1.5 w-1.5 rounded-full ${active ? "bg-white/70" : "bg-slate-300"}`}
              />
            </button>
          );
        })}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const hasValue = value !== "";
  return (
    <div className="space-y-0.5">
      <label
        className={`text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
          hasValue ? "text-red-500" : "text-slate-400"
        }`}
      >
        {label}
      </label>
      <div
        className={`relative border-b transition-colors ${
          disabled
            ? "border-slate-100 opacity-50"
            : hasValue
              ? "border-red-400"
              : "border-slate-200 hover:border-slate-400"
        }`}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none bg-transparent py-1.5 pl-0 pr-6 text-[11px] outline-none cursor-pointer disabled:cursor-not-allowed transition-colors ${
            hasValue ? "text-red-700 font-bold" : "text-slate-600"
          }`}
        >
          {children}
        </select>
        {/* Chevron */}
        <svg
          className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 transition-colors ${
            hasValue ? "text-red-400" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

function Filters() {
  const {
    activeRegion,
    setActiveRegion,
    activeProvince,
    setActiveProvince,
    activeCityMuni,
    setActiveCityMuni,
    resetFilters,
  } = useFilterStore();
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);
  const [regionSearch, setRegionSearch] = useState("");

  const { data: regions, isLoading: loadingRegions } = useQuery({
    queryKey: ["psgc-regions"],
    queryFn: psgcApi.regions,
    staleTime: 1000 * 60 * 10,
  });

  // Always fetch provinces when a region is selected
  const { data: provinces = [], isFetching: loadingProvinces } = useQuery({
    queryKey: ["psgc-provinces", activeRegion],
    queryFn: () => psgcApi.regionProvinces(activeRegion!),
    enabled: !!activeRegion,
    staleTime: 1000 * 60 * 10,
  });

  // Always fetch cities/municipalities when a region is selected
  const { data: allCities = [], isFetching: loadingCities } = useQuery({
    queryKey: ["psgc-cities-munis", activeRegion],
    queryFn: () => psgcApi.regionCitiesMunicipalities(activeRegion!),
    enabled: !!activeRegion,
    staleTime: 1000 * 60 * 10,
  });

  // Filter cities by selected province
  const cities = activeProvince
    ? (allCities as PsgcCityMunicipality[]).filter(
        (c) => c.provinceCode === activeProvince,
      )
    : (allCities as PsgcCityMunicipality[]);

  // Filter regions by search text
  const filteredRegions = regionSearch.trim()
    ? (regions ?? []).filter((r) =>
        r.name.toLowerCase().includes(regionSearch.toLowerCase()),
      )
    : (regions ?? []);

  const handleRegionChange = (code: string) => {
    setRegionSearch("");
    setActiveRegion(code || null);
    if (mapAreaLevel === "region") {
      if (!code) {
        setSelectedLocation(null);
      } else {
        const region = regions?.find((r) => r.code === code);
        setSelectedLocation({
          psgcCode: code,
          name: region?.name ?? code,
          type: "Region",
          lat: 0,
          lng: 0,
        });
      }
    } else {
      setSelectedLocation(null);
    }
  };

  const hasFilters = !!(activeRegion || activeProvince || activeCityMuni);

  return (
    <AccordionSection
      title="Geographical Filter Selectors"
      action={
        hasFilters ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetFilters();
              setSelectedLocation(null);
              setRegionSearch("");
            }}
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3 pt-1">
        {/* Region search + select */}
        <div className="space-y-0.5">
          <label className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Region
          </label>
          {/* Search input */}
          <div className="relative mb-1">
            <input
              type="text"
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              placeholder="Search region…"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 pr-6 text-[11px] outline-none focus:border-red-400 placeholder:text-slate-300"
            />
            {regionSearch && (
              <button
                onClick={() => setRegionSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400"
              >
                ×
              </button>
            )}
          </div>
          <div
            className={`relative border-b transition-colors ${
              activeRegion
                ? "border-red-400"
                : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <select
              value={activeRegion ?? ""}
              onChange={(e) => handleRegionChange(e.target.value)}
              className={`w-full appearance-none bg-transparent py-1.5 pl-0 pr-6 text-[11px] outline-none cursor-pointer transition-colors ${
                activeRegion ? "text-red-700 font-bold" : "text-slate-600"
              }`}
            >
              <option value="">All Regions</option>
              {loadingRegions ? (
                <option disabled>Loading…</option>
              ) : (
                filteredRegions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))
              )}
            </select>
            <svg
              className={`pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 transition-colors ${
                activeRegion ? "text-red-400" : "text-slate-400"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Province — shown whenever a region is selected */}
        {activeRegion && (
          <FilterSelect
            label="Province"
            value={activeProvince ?? ""}
            onChange={(v) => setActiveProvince(v || null)}
            disabled={loadingProvinces}
          >
            <option value="">
              {loadingProvinces ? "Loading…" : "All Provinces"}
            </option>
            {(provinces as { code: string; name: string }[]).map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </FilterSelect>
        )}

        {/* City / Municipality — shown when a region is selected */}
        {activeRegion && (
          <FilterSelect
            label="City / Municipality"
            value={activeCityMuni ?? ""}
            onChange={(v) => setActiveCityMuni(v || null)}
            disabled={loadingCities}
          >
            <option value="">
              {loadingCities
                ? "Loading…"
                : activeProvince
                  ? "All in Province"
                  : "All Cities/Municipalities"}
            </option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Map Display Toggles — choropleth / dots / numbers
// ---------------------------------------------------------------------------
function MapDisplayToggles() {
  const showChoropleth = useMapStore((s) => s.showChoropleth);
  const showDots = useMapStore((s) => s.showDots);
  const showNumbers = useMapStore((s) => s.showNumbers);
  const setShowChoropleth = useMapStore((s) => s.setShowChoropleth);
  const setShowDots = useMapStore((s) => s.setShowDots);
  const setShowNumbers = useMapStore((s) => s.setShowNumbers);

  const options = [
    {
      key: "choropleth",
      label: "Choropleth",
      value: showChoropleth,
      toggle: () => setShowChoropleth(!showChoropleth),
    },
    {
      key: "dots",
      label: "Data Dots",
      value: showDots,
      toggle: () => setShowDots(!showDots),
    },
    {
      key: "numbers",
      label: "Count Labels",
      value: showNumbers,
      toggle: () => setShowNumbers(!showNumbers),
    },
  ];

  return (
    <AccordionSection title="Map Display">
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map(({ key, label, value, toggle }) => (
          <button
            key={key}
            onClick={toggle}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
              value
                ? "border-red-300 bg-red-600 text-white hover:bg-red-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Dataset Layer Switcher — multi-select checkboxes
// ---------------------------------------------------------------------------
function DatasetLayerSwitcher() {
  const { activeLayerDatasetIds, toggleLayer, setActiveLayer } =
    useDatasetLayerStore();
  const setMapAreaLevel = useMapStore((s) => s.setMapAreaLevel);
  const updateWidget = useWorkspaceStore((s) => s.updateWidget);

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["datasets", "active"],
    queryFn: () => fetchDatasets(true),
    staleTime: 1000 * 60 * 2,
  });

  if (!isLoading && datasets.length === 0) return null;

  const PSGC_TO_MAP_LEVEL: Record<string, MapAreaLevel> = {
    barangay: "municity",
    city: "municity",
    province: "province",
  };

  const handleClearAll = () => {
    setActiveLayer(null);
    updateWidget("recordsPanel", { visible: false });
  };

  return (
    <AccordionSection
      title="Map Layer"
      defaultOpen={true}
      action={
        activeLayerDatasetIds.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAll();
            }}
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      <div className="space-y-1.5 pt-1">
        {isLoading && (
          <p className="py-1 text-[10px] text-slate-400">Loading datasets…</p>
        )}

        {datasets.map((ds) => {
          const checked = activeLayerDatasetIds.includes(ds.id);
          return (
            <button
              key={ds.id}
              onClick={() => {
                toggleLayer(ds.id, ds.psgc_level);
                if (!checked) {
                  setMapAreaLevel(PSGC_TO_MAP_LEVEL[ds.psgc_level] ?? "region");
                  useFilterStore.getState().setActiveRegion(null);
                  updateWidget("recordsPanel", { visible: true });
                } else {
                  const remaining = activeLayerDatasetIds.filter(
                    (x) => x !== ds.id,
                  );
                  if (remaining.length === 0) {
                    updateWidget("recordsPanel", { visible: false });
                  }
                }
              }}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all ${
                checked
                  ? "border-red-300 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <span className="block truncate text-[11px] font-semibold">
                  {ds.name}
                </span>
                <span
                  className={`text-[9px] ${
                    checked ? "text-red-200" : "text-slate-400"
                  }`}
                >
                  {ds.entity_type} · {ds.psgc_level}
                </span>
              </div>
              {checked && (
                <svg
                  className="ml-2 h-3.5 w-3.5 shrink-0 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Disaster Layers — layer toggles + count badges + widget shortcut
// ---------------------------------------------------------------------------
function DisasterLayers() {
  const {
    earthquakesEnabled,
    toggleEarthquakes,
    volcanoesEnabled,
    toggleVolcanoes,
    typhoonsEnabled,
    toggleTyphoons,
    floodsEnabled,
    toggleFloods,
    heatmapEnabled,
    toggleHeatmap,
  } = useDisasterStore();

  const { toggleWidget } = useWorkspaceStore();

  // Poll counts endpoint (public — no auth required)
  const { data: counts } = useQuery({
    queryKey: ["disasters", "counts"],
    queryFn: () => disasterApi.counts(),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    retry: 2,
  });

  const byType = counts?.byType ?? {};

  const layers = [
    {
      key: "earthquakes",
      label: "Earthquakes",
      sublabel: "USGS · past 7 days",
      value: earthquakesEnabled,
      toggle: toggleEarthquakes,
      live: true,
      countType: "earthquake",
    },
    {
      key: "volcanoes",
      label: "Volcanoes",
      sublabel: "PHIVOLCS · active list",
      value: volcanoesEnabled,
      toggle: toggleVolcanoes,
      live: true,
      countType: null,
    },
    {
      key: "typhoons",
      label: "Typhoons",
      sublabel: "Integration pending",
      value: typhoonsEnabled,
      toggle: toggleTyphoons,
      live: false,
      countType: "typhoon",
    },
    {
      key: "floods",
      label: "Floods",
      sublabel: "ReliefWeb · humanitarian",
      value: floodsEnabled,
      toggle: toggleFloods,
      live: true,
      countType: "humanitarian",
    },
    {
      key: "heatmap",
      label: "Heat Index",
      sublabel: "Integration pending",
      value: heatmapEnabled,
      toggle: toggleHeatmap,
      live: false,
      countType: null,
    },
  ];

  const totalCount = Object.values(byType).reduce((a, b) => a + b, 0);

  return (
    <AccordionSection title="Disaster Layers" defaultOpen={false}>
      {/* Open DisasterPanel widget shortcut */}
      <div className="mb-2 pt-1">
        <button
          onClick={() => toggleWidget("disasterPanel")}
          className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-red-600 px-2.5 py-2 text-left text-[11px] font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            View All Events
          </div>
          {totalCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">
              {totalCount}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-1.5">
        {layers.map(
          ({ key, label, sublabel, value, toggle, live, countType }) => {
            const count = countType ? (byType[countType] ?? 0) : null;
            return (
              <button
                key={key}
                onClick={live ? toggle : undefined}
                disabled={!live}
                className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all ${
                  !live
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50"
                    : value
                      ? "border-red-300 bg-red-600 text-white hover:bg-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold">
                    {label}
                  </span>
                  <span
                    className={`text-[9px] ${value && live ? "text-red-200" : "text-slate-400"}`}
                  >
                    {sublabel}
                  </span>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                  {!live && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                      Soon
                    </span>
                  )}
                  {live && count != null && count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        value
                          ? "bg-white/20 text-white"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {value && live && (
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          },
        )}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function SidebarFilters() {
  return (
    <>
      <ElectionCountdown />
      <WidgetToggles />
      <RssFeedSettings />
      <VideoLinkManager />
      <DatasetLayerSwitcher />
      <MapDisplayToggles />
      <DisasterLayers />
      <MapAreaToggle />
      <Filters />
    </>
  );
}
