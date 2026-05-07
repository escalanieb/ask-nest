import { lazy, Suspense, useState, useRef } from "react";
import CommandBar from "../components/dashboard/CommandBar";
import SidebarFilters from "../components/dashboard/SidebarFilters";
import StatusBar from "../components/dashboard/StatusBar";
import AnalyticsPanel from "../components/widgets/AnalyticsPanel";
import RssFeedPanel from "../components/widgets/RssFeedPanel";
import VideoPanel from "../components/widgets/VideoPanel";
import DisasterPanel from "../components/widgets/DisasterPanel";
import WidgetShell from "../components/widgets/WidgetShell";
import DatasetRecordsPanel from "../components/map/DatasetRecordsPanel";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";

// Lazy-load the map to avoid SSR issues with Leaflet
const MapCanvas = lazy(() => import("../components/map/MapCanvas"));

// Derive type from widget ID as fallback for old persisted entries without a type field
function resolveType(widget: { type?: string; id: string }): string {
  if (widget.type) return widget.type;
  if (widget.id.startsWith("analytics")) return "analytics";
  if (widget.id.startsWith("rss")) return "rss";
  if (widget.id.startsWith("records")) return "records";
  if (widget.id.startsWith("video")) return "video";
  if (widget.id.startsWith("disaster")) return "disaster";
  return "";
}

// Map widget type to component
function getWidgetComponent(type: string) {
  switch (type) {
    case "analytics":
      return AnalyticsPanel;
    case "rss":
      return RssFeedPanel;
    case "records":
      return DatasetRecordsPanel;
    case "video":
      return VideoPanel;
    case "disaster":
      return DisasterPanel;
    default:
      return null;
  }
}

// Map widget type to display title
function getWidgetTitle(type: string) {
  switch (type) {
    case "analytics":
      return "Analytics";
    case "rss":
      return "RSS News Feeds";
    case "records":
      return "Dataset Records";
    case "video":
      return "Video / Livestream";
    case "disaster":
      return "Disaster Events";
    default:
      return "Panel";
  }
}

export default function Dashboard() {
  const widgets = useWorkspaceStore((s) => s.widgets);
  const panelOrder = useWorkspaceStore((s) => s.panelOrder);
  const reorderPanels = useWorkspaceStore((s) => s.reorderPanels);

  const visiblePanels = panelOrder.filter((id) => widgets[id]?.visible);

  // Drag-to-reorder state
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragStart(idx: number, id: string) {
    dragIdx.current = idx;
    setDraggingId(id);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === toIdx) return;

    const fromId = visiblePanels[fromIdx];
    const toId = visiblePanels[toIdx];

    // Reorder within the full panelOrder list
    const next = [...panelOrder];
    const fi = next.indexOf(fromId);
    const ti = next.indexOf(toId);
    next.splice(fi, 1);
    next.splice(ti, 0, fromId);
    reorderPanels(next);

    dragIdx.current = null;
    setOverIdx(null);
    setDraggingId(null);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setOverIdx(null);
    setDraggingId(null);
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 overflow-hidden">
      {/* Navigation Bar */}
      <CommandBar />

      {/* Main content — left column (map + tray) + right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: map on top (2/3), panel tray on bottom (1/3) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Map — takes 2/3 of vertical space */}
          <main className="relative overflow-hidden" style={{ flex: 2 }}>
            {/* Isolated stacking context keeps Leaflet z-indices contained */}
            <div className="absolute inset-0 [isolation:isolate]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Loading map…
                  </div>
                }
              >
                <MapCanvas />
              </Suspense>
            </div>
          </main>

          {/* Panel tray — takes 1/3 of vertical space */}
          <div
            className="flex shrink-0 overflow-hidden border-t-2 border-slate-300 bg-slate-100"
            style={{ flex: 1 }}
          >
            {visiblePanels.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                  />
                </svg>
                No panels open — enable panels from the sidebar
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden divide-x divide-slate-200">
                {visiblePanels.map((id, idx) => {
                  const widget = widgets[id];
                  const type = resolveType(widget);
                  const Component = getWidgetComponent(type);
                  if (!Component) return null;

                  return (
                    <WidgetShell
                      key={id}
                      id={id}
                      title={getWidgetTitle(type)}
                      isDragging={draggingId === id}
                      isDragOver={overIdx === idx && draggingId !== id}
                      onDragStart={() => handleDragStart(idx, id)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <Component />
                    </WidgetShell>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — spans full height of content area */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <SidebarFilters />
          </div>
        </aside>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
