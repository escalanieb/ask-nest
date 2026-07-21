import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { disasterApi } from "../../services/api/disasterApi";
import type { DisasterEvent, DisasterType } from "../../services/api/disasterApi";
import { useDisasterStore } from "../../stores/useDisasterStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-500",
};

const TYPE_LABELS: Record<string, string> = {
  earthquake: "Earthquake",
  typhoon: "Typhoon",
  flood: "Flood",
  volcano: "Volcano",
  drought: "Drought",
  alert: "Alert",
  humanitarian: "Humanitarian",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type Tab = "all" | DisasterType | "typhoon_ph";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "earthquake", label: "Earthquakes" },
  { key: "typhoon_ph", label: "Typhoons 🇵🇭" },
  { key: "alert", label: "Alerts" },
  { key: "humanitarian", label: "Reports" },
];

// ---------------------------------------------------------------------------
// Event row
// ---------------------------------------------------------------------------

function EventRow({ ev }: { ev: DisasterEvent }) {
  const url = ev.metrics?.url ?? null;

  const inner = (
    <div className="flex items-start gap-2 px-3 py-2">
      {/* Severity dot */}
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[ev.severity] ?? "bg-slate-400"}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[11px] font-semibold leading-snug ${
            url ? "text-slate-700 group-hover:text-red-600" : "text-slate-700"
          }`}
        >
          {ev.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          {ev.location_label && (
            <span className="text-[9px] text-slate-500 truncate max-w-[140px]">
              {ev.location_label}
            </span>
          )}
          <span className="text-[9px] text-slate-400">{timeAgo(ev.event_started_at)}</span>
          <span className="ml-auto shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-500">
            {ev.source}
          </span>
        </div>
        {ev.summary && (
          <p className="mt-0.5 text-[9px] text-slate-400 line-clamp-2 leading-snug">{ev.summary}</p>
        )}
        {/* Earthquake metrics */}
        {ev.type === "earthquake" && ev.metrics?.magnitude != null && (
          <p className="mt-0.5 text-[9px] text-slate-500">
            M{ev.metrics.magnitude.toFixed(1)}
            {ev.metrics.depth_km != null && ` · ${ev.metrics.depth_km} km deep`}
            {ev.metrics.tsunami === 1 && (
              <span className="ml-1 text-blue-500 font-semibold">· Tsunami warning</span>
            )}
          </p>
        )}
        {url && (
          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 group-hover:text-red-500">
            Open link
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block border-b border-slate-100 hover:bg-red-50 transition-colors"
      >
        {inner}
      </a>
    );
  }

  return <div className="border-b border-slate-100 hover:bg-slate-50">{inner}</div>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DisasterPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Main latest events (all types)
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["disasters", "panel"],
    queryFn: () => disasterApi.latest(),
    staleTime: 1000 * 60 * 10,
    refetchInterval: 1000 * 60 * 10,
  });

  // Philippines typhoon events (dedicated cached endpoint — no auth required)
  const {
    data: phTyphoonResponse,
    isLoading: isTyphoonLoading,
    isError: isTyphoonError,
    refetch: refetchTyphoon,
  } = useQuery({
    queryKey: ["disasters", "typhoon", "ph"],
    queryFn: () => disasterApi.typhoonPh(50),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  // Sync fetched events into the shared store (must be in an effect,
  // never called directly during render to avoid React setState-in-render warning).
  const setEvents = useDisasterStore((s) => s.setEvents);
  useEffect(() => {
    if (response?.data) {
      setEvents(response.data, response.generated_at);
    }
  }, [response, setEvents]);

  const events = response?.data ?? [];
  const phTyphoonEvents: DisasterEvent[] = phTyphoonResponse?.data ?? [];

  // Merge PH typhoon events into the All view (deduplicate by external_id)
  const allEvents = useMemo(() => {
    const seen = new Set(events.map((e) => e.external_id));
    const extras = phTyphoonEvents.filter((e) => !seen.has(e.external_id));
    return [...events, ...extras];
  }, [events, phTyphoonEvents]);

  const filtered: DisasterEvent[] = useMemo(() => {
    if (activeTab === "all") return allEvents;
    if (activeTab === "typhoon_ph") return phTyphoonEvents;
    return events.filter((e) => e.type === activeTab);
  }, [activeTab, allEvents, events, phTyphoonEvents]);

  const countFor = (tab: Tab) => {
    if (tab === "all") return allEvents.length;
    if (tab === "typhoon_ph") return phTyphoonEvents.length;
    return events.filter((e) => e.type === tab).length;
  };

  // Per-tab loading / error state so each tab renders independently
  const tabIsLoading = activeTab === "typhoon_ph" ? isTyphoonLoading : isLoading;
  const tabIsError = activeTab === "typhoon_ph" ? isTyphoonError : isError;
  const tabRefetch = activeTab === "typhoon_ph" ? refetchTyphoon : refetch;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-red-700 bg-red-600 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">
          Disaster Events
        </span>
        <div className="flex items-center gap-2">
          {response?.generated_at && (
            <span className="text-[9px] text-red-200">
              Updated {timeAgo(response.generated_at)}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="text-red-200 hover:text-white transition-colors"
            title="Refresh"
          >
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 gap-0 border-b border-slate-100 bg-slate-50">
        {TABS.map((t) => {
          const count = countFor(t.key);
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                activeTab === t.key
                  ? "border-b-2 border-red-500 text-red-600 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`ml-1 rounded-full px-1 text-[8px] font-bold ${
                    activeTab === t.key ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tabIsLoading && (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Loading disaster data…
          </div>
        )}
        {tabIsError && (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <p className="text-xs text-red-400">Failed to load disaster data.</p>
            <button
              onClick={() => tabRefetch()}
              className="rounded bg-red-50 px-3 py-1 text-[10px] text-red-600 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
        {!tabIsLoading && !tabIsError && filtered.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            No
            {activeTab !== "all" ? ` ${TYPE_LABELS[activeTab] ?? activeTab}` : ""} events.
          </div>
        )}
        {!tabIsLoading &&
          !tabIsError &&
          filtered.map((ev) => <EventRow key={ev.external_id} ev={ev} />)}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] text-slate-400">
        Sources: USGS · GDACS · ReliefWeb · Refreshed every 15 min
      </div>
    </div>
  );
}
