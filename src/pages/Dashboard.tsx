import { lazy, Suspense } from "react";
import CommandBar from "../components/dashboard/CommandBar";
import ExploreSidebar from "../components/explore/ExploreSidebar";
import StatusBar from "../components/dashboard/StatusBar";
import SummaryBar from "../components/dashboard/SummaryBar";
import BottomTray from "../components/dashboard/BottomTray";
import MapStyleControl from "../components/map/MapStyleControl";

// Lazy-load the map to avoid SSR issues with Leaflet
const MapCanvas = lazy(() => import("../components/map/MapCanvas"));

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col bg-slate-50 overflow-hidden">
      {/* Navigation Bar */}
      <CommandBar />

      {/* Main content — left column (map + tray) + right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: map on top (2/3), panel tray on bottom (1/3) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <SummaryBar />
          {/* Map — takes 2/3 of vertical space */}
          <main className="relative overflow-hidden" style={{ flex: 2 }}>
            {/* Isolated stacking context keeps Leaflet z-indices contained */}
            <div className="absolute inset-0 [isolation:isolate]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                <MapStyleControl />
              </Suspense>
            </div>
          </main>

          <BottomTray />
        </div>

        {/* Right sidebar — spans full height of content area */}
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <ExploreSidebar />
          </div>
        </aside>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
