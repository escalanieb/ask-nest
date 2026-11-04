import { useState } from "react";
import { useEffectiveMapSource } from "../../stores/useMapSourceStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore, type MapAreaLevel } from "../../stores/useMapStore";

const LEVELS: { id: MapAreaLevel; label: string }[] = [
  { id: "region", label: "Region" },
  { id: "province", label: "Province" },
  { id: "municity", label: "City" },
];

/** Small floating control on the map. Plain names for the three display options and the zoom level. */
export default function MapStyleControl() {
  const [open, setOpen] = useState(false);
  const source = useEffectiveMapSource();
  const { showChoropleth, showDots, showNumbers, setShowChoropleth, setShowDots, setShowNumbers } =
    useMapStore();
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);
  const setMapAreaLevel = useMapStore((s) => s.setMapAreaLevel);
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const setActiveProvince = useFilterStore((s) => s.setActiveProvince);

  function chooseLevel(level: MapAreaLevel) {
    if (level === mapAreaLevel) return;
    setMapAreaLevel(level);
    setSelectedLocation(null);
    // Keep the chosen region so provinces/cities can load straight away.
    setActiveProvince(null);
  }

  const toggles = [
    { label: "Colour areas by count", value: showChoropleth, set: setShowChoropleth, always: true },
    { label: "Show dots", value: showDots, set: setShowDots, always: false },
    { label: "Show numbers", value: showNumbers, set: setShowNumbers, always: false },
  ].filter((t) => t.always || source === "imported");

  return (
    <div className="absolute right-3 top-3 z-[1000] text-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow"
      >
        Map style
      </button>
      {open && (
        <div className="mt-1 w-56 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <div className="space-y-1.5">
            {toggles.map((t) => (
              <label key={t.label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.value}
                  onChange={(e) => t.set(e.target.checked)}
                />
                {t.label}
              </label>
            ))}
          </div>
          <div>
            <p className="mb-1 font-semibold text-slate-600">Group the map by</p>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              {LEVELS.map(({ id, label }, i) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mapAreaLevel === id}
                  onClick={() => chooseLevel(id)}
                  className={`flex-1 py-1.5 font-medium ${i > 0 ? "border-l border-slate-200" : ""} ${
                    mapAreaLevel === id
                      ? "bg-team text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
              Uses 2019 boundaries. Areas that changed since then may be missing. Choose a region to
              see its cities.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
