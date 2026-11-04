import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { psgcApi, type PsgcCityMunicipality } from "../../services/api/psgcApi";
import { rssFeedApi, type RssFeed } from "../../services/api/rssFeedApi";
import { disasterApi } from "../../services/api/disasterApi";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore } from "../../stores/useMapStore";
import { useTrayStore } from "../../stores/useTrayStore";
import { useRssStore } from "../../stores/useRssStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useDisasterStore } from "../../stores/useDisasterStore";
import { useElectionCountdown } from "../../hooks/useElectionCountdown";
import { useVideoStore, type VideoPlatform } from "../../stores/useVideoStore";
import { fetchTipasEvents } from "../../services/api/tipasApi";

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
          aria-expanded={open}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {action}
      </div>
      {open && <div className={contentClassName ?? "px-4 pb-3"}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------
function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}

export function ElectionCountdown() {
  const { months, weeks, days, hours, minutes, seconds, isPast } = useElectionCountdown();

  return (
    <div className="shrink-0 border-b border-slate-200 bg-gradient-to-br from-team-strong via-team to-team px-5 py-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-team-foreground/80 mb-0.5">
            Countdown to
          </p>
          <h2 className="text-base font-bold text-white leading-tight">PH Elections 2028</h2>
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
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-team-foreground/80">
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
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-team-foreground/80">
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
// RSS Feed Settings (News tab, admins only)
// ---------------------------------------------------------------------------
export function RssFeedSettings() {
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
    <AccordionSection title="Add or remove news sources" defaultOpen={false}>
      <div className="space-y-1 pt-1">
        {isLoading && <p className="py-1 text-[10px] text-slate-400">Loading feeds…</p>}
        {isError && <p className="py-1 text-[10px] text-red-400">Failed to load feeds.</p>}

        {feeds.map((feed) => (
          <div key={feed.id} className="flex items-center gap-1">
            <button
              onClick={() => setActiveFeedId(feed.id)}
              className={`flex min-w-0 flex-1 flex-col rounded-lg px-2.5 py-1.5 text-left transition-all ${
                activeFeedId === feed.id
                  ? "bg-team text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold">
                {feed.name}
                {feed.is_shared ? " · Shared" : ""}
              </span>
              {feed.category && (
                <span
                  className={`text-[9px] ${
                    activeFeedId === feed.id ? "text-team-foreground/80" : "text-slate-400"
                  }`}
                >
                  {feed.category}
                </span>
              )}
            </button>
            {isAdmin && feed.can_manage && (
              <button
                onClick={() => {
                  if (confirm(`Remove "${feed.name}"?`)) deleteMutation.mutate(feed.id);
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
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-[10px] text-slate-400 transition-colors hover:border-team hover:text-team"
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
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-team"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed"
              type="url"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-team"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-team"
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
                className="flex-1 rounded bg-team py-1 text-[10px] font-semibold text-white hover:bg-team-strong disabled:opacity-50"
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
export function VideoLinkManager() {
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
    <AccordionSection title="Saved video links" defaultOpen={true}>
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
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 text-[10px] text-slate-400 transition-colors hover:border-team hover:text-team"
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
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-team"
            />
            <textarea
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder={"Paste <iframe> embed code\n(YouTube or Facebook)"}
              rows={3}
              className="w-full resize-none rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] outline-none focus:border-team"
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
                className="flex-1 rounded bg-team py-1 text-[10px] font-semibold text-white hover:bg-team-strong"
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

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-slate-200 bg-transparent py-1.5 text-[11px] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export function Filters() {
  const {
    activeRegion,
    setActiveRegion,
    activeProvince,
    setActiveProvince,
    activeCityMuni,
    setActiveCityMuni,
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
    ? (allCities as PsgcCityMunicipality[]).filter((c) => c.provinceCode === activeProvince)
    : (allCities as PsgcCityMunicipality[]);

  // Filter regions by search text
  const filteredRegions = regionSearch.trim()
    ? (regions ?? []).filter((r) => r.name.toLowerCase().includes(regionSearch.toLowerCase()))
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
      title="Geographic area"
      action={
        hasFilters ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveRegion(null);
              if (useMapStore.getState().mapAreaLevel === "municity")
                useMapStore.getState().setMapAreaLevel("region");
              setSelectedLocation(null);
              setRegionSearch("");
            }}
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-team hover:text-team transition-colors"
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
              aria-label="Search regions"
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              placeholder="Search region…"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 pr-6 text-[11px] outline-none focus:border-team placeholder:text-slate-300"
            />
            {regionSearch && (
              <button
                onClick={() => setRegionSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-team"
              >
                ×
              </button>
            )}
          </div>
          <div
            className={`relative border-b transition-colors ${
              activeRegion ? "border-team" : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <select
              aria-label="Region"
              value={activeRegion ?? ""}
              onChange={(e) => handleRegionChange(e.target.value)}
              className={`w-full appearance-none bg-transparent py-1.5 pl-0 pr-6 text-[11px] outline-none cursor-pointer transition-colors ${
                activeRegion ? "text-team font-bold" : "text-slate-600"
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
                activeRegion ? "text-team" : "text-slate-400"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
            <option value="">{loadingProvinces ? "Loading…" : "All Provinces"}</option>
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
// Disaster Layers — layer toggles + count badges + widget shortcut
// ---------------------------------------------------------------------------
export function DisasterLayers() {
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
      label: "Typhoons 🇵🇭",
      sublabel: "GDACS · Philippines",
      value: typhoonsEnabled,
      toggle: toggleTyphoons,
      live: true,
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

  return (
    <AccordionSection title="Show on the map" defaultOpen={true}>
      <div className="space-y-1.5">
        {layers.map(({ key, label, sublabel, value, toggle, live, countType }) => {
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
                    ? "border-team bg-team text-white hover:bg-team-strong"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold">{label}</span>
                <span
                  className={`text-[9px] ${value && live ? "text-team-foreground/80" : "text-slate-400"}`}
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
                      value ? "bg-white/20 text-white" : "bg-team-soft text-team"
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// TIPAS Layer Switcher
// ---------------------------------------------------------------------------
export function TipasLayerSwitcher() {
  const state = useFilterStore();
  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ["tipas-events"], queryFn: fetchTipasEvents, staleTime: 300_000 });
  const view =
    state.showTipasEvents && state.showTipasAttendees
      ? "both"
      : state.showTipasAttendees
        ? "attendees"
        : "events";
  const event = events.find((item) => item.id === state.selectedTipasEventId);
  return (
    <AccordionSection title="TIPAS" defaultOpen={true}>
      <div className="p-3 space-y-3 text-xs">
        <label className="block">
          Event
          <select
            className="block w-full mt-1 rounded border p-2"
            id="tipas-map-event"
            value={state.selectedTipasEventId ?? ""}
            onChange={(e) => {
              state.setSelectedTipasEventId(e.target.value ? Number(e.target.value) : null);
              useDatasetLayerStore.getState().setChoroplethSelection(null);
            }}
          >
            <option value="">All events</option>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {isLoading && <p>Loading events…</p>}
        {isError && <button onClick={() => refetch()}>Could not load events. Retry</button>}
        {!isLoading && !isError && !events.length && <p>No TIPAS events available.</p>}
        <label className="block">
          Show
          <select
            className="block w-full mt-1 rounded border p-2"
            value={view}
            onChange={(e) => {
              state.setShowTipasEvents(e.target.value !== "attendees");
              state.setShowTipasAttendees(e.target.value !== "events");
              useDatasetLayerStore.getState().setChoroplethSelection(null);
            }}
          >
            <option value="events">Event locations</option>
            <option value="attendees">Attendee residence distribution</option>
            <option value="both">Both</option>
          </select>
        </label>
        <p className="text-slate-500">
          Pins show approximate event venue areas; shading shows attendees’ residence areas.
        </p>
        <p>
          {event
            ? event.registered_count
            : events.reduce((sum, item) => sum + item.registered_count, 0)}{" "}
          registered ·{" "}
          {event
            ? event.checked_in_count
            : events.reduce((sum, item) => sum + item.checked_in_count, 0)}{" "}
          checked in
        </p>
        <button
          className="underline font-semibold"
          onClick={() => useTrayStore.getState().setTab("results")}
        >
          Open records
        </button>
        {!event && (
          <p className="text-slate-500">
            All events shows aggregate counts. Select one event to browse attendee records.
          </p>
        )}
      </div>
    </AccordionSection>
  );
}
