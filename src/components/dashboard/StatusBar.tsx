import { useMapStore } from "../../stores/useMapStore";
import { useFilterStore } from "../../stores/useFilterStore";

export default function StatusBar() {
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const { activeRegion, activeStatus } = useFilterStore();

  const activeFilterCount = [activeRegion, activeStatus].filter(Boolean).length;

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-[11px] text-slate-400">
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <span className="flex items-center gap-1.5 font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>

        <span className="h-3.5 w-px bg-slate-200" />

        {/* Selected location */}
        {selectedLocation ? (
          <span className="text-slate-500">
            Viewing{" "}
            <span className="font-medium text-slate-700">
              {selectedLocation.name}
            </span>
            <span className="ml-1 text-slate-400">
              ({selectedLocation.psgcCode})
            </span>
          </span>
        ) : (
          <span>No region selected — click the map to begin</span>
        )}

        {/* Active filter count */}
        {activeFilterCount > 0 && (
          <>
            <span className="h-3.5 w-px bg-slate-200" />
            <span className="font-medium text-amber-600">
              {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
              active
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-slate-400">
        <span>Communications Dashboard</span>
        <span className="h-3.5 w-px bg-slate-200" />
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
