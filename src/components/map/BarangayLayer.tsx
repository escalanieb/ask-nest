import { useEffect } from "react";
import { geoJSON, type Layer, type PathOptions } from "leaflet";
import { GeoJSON, Pane, useMap } from "react-leaflet";
import { BarangayShapesUnavailable } from "../../services/mapBoundaries";
import { useBarangayShapes } from "../../hooks/useBarangayShapes";
import { useFilterStore } from "../../stores/useFilterStore";
import { barangayCode } from "../../lib/barangayCode";

const OUTLINE: PathOptions = {
  color: "#475569",
  weight: 1,
  fillColor: "#94a3b8",
  fillOpacity: 0.06,
};
const SELECTED: PathOptions = {
  color: "#0f766e",
  weight: 3,
  fillColor: "#0f766e",
  fillOpacity: 0.25,
};

/**
 * Barangay outlines for the selected city. Political explorer only: other teams never
 * pick a barangay, so their map is unchanged. Clicking a shape selects that barangay.
 */
export default function BarangayLayer() {
  const map = useMap();
  const { city, data } = useBarangayShapes();
  const selected = useFilterStore((s) => s.activeBarangay);
  const setActiveBarangay = useFilterStore((s) => s.setActiveBarangay);

  // Fit the whole city when its shapes arrive, or the chosen barangay when one is picked.
  useEffect(() => {
    if (!data) return;
    const feature = selected ? data.features.find((f) => barangayCode(f) === selected) : undefined;
    const bounds = geoJSON(feature ?? data).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: feature ? 16 : 14 });
  }, [data, selected, map]);

  if (!city || !data) return null;
  return (
    <Pane name="barangays" style={{ zIndex: 450 }}>
      <GeoJSON
        key={`${city}:${selected ?? ""}`}
        data={data}
        pane="barangays"
        // A click on a shape selects it; it must not reach the map's "click empty map to deselect".
        bubblingMouseEvents={false}
        style={(feature) => (feature && barangayCode(feature) === selected ? SELECTED : OUTLINE)}
        onEachFeature={(feature: GeoJSON.Feature, layer: Layer) => {
          layer.bindTooltip(String(feature.properties?.ADM4_EN ?? "Barangay"), { sticky: true });
          layer.on("click", () => setActiveBarangay(barangayCode(feature)));
        }}
      />
    </Pane>
  );
}

/** Small status line on the map: loading, no shapes for this city, or a retry. */
export function BarangayNotice() {
  const { enabled, city, isLoading, isError, error, refetch } = useBarangayShapes();
  if (!enabled || !city || (!isLoading && !isError)) return null;
  const unavailable = error instanceof BarangayShapesUnavailable;
  return (
    <div
      role="status"
      className="absolute bottom-8 left-3 z-[800] max-w-[260px] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow ring-1 ring-slate-200"
    >
      {isLoading && "Loading barangay shapes…"}
      {unavailable &&
        "Barangay shapes are not available for this city. You can still pick a barangay from the list."}
      {isError && !unavailable && (
        <>
          Could not load barangay shapes.{" "}
          <button type="button" className="font-semibold underline" onClick={() => refetch()}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
