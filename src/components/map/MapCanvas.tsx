import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { Link } from "react-router-dom";
import type { Layer, PathOptions, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { useMapStore } from "../../stores/useMapStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import type { ChoroplethSelection } from "../../stores/useDatasetLayerStore";
import { useDisasterStore } from "../../stores/useDisasterStore";
import { fetchDatasetLayer } from "../../services/api/datasetApi";
import type {
  LayerDataPoint,
  LayerResponse,
} from "../../services/api/datasetApi";
import { disasterApi } from "../../services/api/disasterApi";
import type { DisasterEvent } from "../../services/api/disasterApi";
import { queryClient } from "../../lib/queryClient";
import NestLogo from "../NestLogo";

// Fix Leaflet default icon paths broken by bundlers
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const PH_CENTER: [number, number] = [12.8797, 121.774];

const BASE_GEO_URL =
  "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2019/geojson/";

// One file per region (18 regions)
const PROVINCE_REGION_CODES = [
  "010000000",
  "020000000",
  "030000000",
  "040000000",
  "050000000",
  "060000000",
  "070000000",
  "080000000",
  "090000000",
  "100000000",
  "110000000",
  "120000000",
  "130000000",
  "140000000",
  "150000000",
  "160000000",
  "170000000",
  "180000000",
];

// One file per province — grouped by region prefix (first 2 digits)
const MUNICITY_PROVINCE_CODES = [
  "012800000",
  "012900000",
  "013300000",
  "015500000",
  "020900000",
  "021500000",
  "023100000",
  "025000000",
  "025700000",
  "030800000",
  "031400000",
  "034900000",
  "035400000",
  "036900000",
  "037100000",
  "037700000",
  "041000000",
  "042100000",
  "043400000",
  "045600000",
  "045800000",
  "050500000",
  "051600000",
  "051700000",
  "052000000",
  "054100000",
  "056200000",
  "060400000",
  "060600000",
  "061900000",
  "063000000",
  "067900000",
  "071200000",
  "072200000",
  "076100000",
  "082600000",
  "083700000",
  "084800000",
  "086000000",
  "086400000",
  "087800000",
  "097200000",
  "097300000",
  "098300000",
  "099700000",
  "101300000",
  "101800000",
  "103500000",
  "104200000",
  "104300000",
  "112300000",
  "112400000",
  "112500000",
  "118200000",
  "118600000",
  "124700000",
  "126300000",
  "126500000",
  "128000000",
  "129800000",
  "133900000",
  "137400000",
  "137500000",
  "137600000",
  "140100000",
  "141100000",
  "142700000",
  "143200000",
  "144400000",
  "148100000",
  "150700000",
  "153600000",
  "153800000",
  "156600000",
  "157000000",
  "160200000",
  "160300000",
  "166700000",
  "166800000",
  "168500000",
  "174000000",
  "175100000",
  "175200000",
  "175300000",
  "175900000",
  "184500000",
  "184600000",
];

const GEO_LEVEL_TYPES = {
  region: "Region",
  province: "Province",
  municity: "City/Municipality",
} as const;

async function fetchGeoJSON(
  url: string,
): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json() as Promise<GeoJSON.FeatureCollection>;
  } catch {
    return null;
  }
}

function mergeCollections(
  collections: (GeoJSON.FeatureCollection | null)[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const c of collections) {
    if (c?.features) features.push(...c.features);
  }
  return { type: "FeatureCollection", features };
}

// Module-level map instance — set once on mount, kept for future use

// Centroid cache: psgcCode → lat/lng — populated during onEachFeature for municity level
const centroidMap = new Map<string, { lat: number; lng: number }>();

// Active Philippine volcanoes — static list
const PH_VOLCANOES = [
  { name: "Mayon", lat: 13.2575, lng: 123.6853 },
  { name: "Taal", lat: 14.0113, lng: 120.9931 },
  { name: "Bulusan", lat: 12.7693, lng: 124.0547 },
  { name: "Kanlaon", lat: 10.4119, lng: 123.1322 },
  { name: "Pinatubo", lat: 15.1429, lng: 120.3496 },
  { name: "Camiguin de Babuyanes", lat: 18.8333, lng: 121.8581 },
  { name: "Didicas", lat: 19.0797, lng: 122.2025 },
  { name: "Smith Volcano", lat: 20.525, lng: 121.9194 },
  { name: "Musuan", lat: 7.8789, lng: 125.0694 },
  { name: "Ragang", lat: 7.6789, lng: 124.5017 },
  { name: "Apo", lat: 6.988, lng: 125.2711 },
  { name: "Hibok-Hibok", lat: 9.2028, lng: 124.6716 },
  { name: "Leonard Kniaseff", lat: 8.5764, lng: 124.0458 },
  { name: "Parker", lat: 6.11, lng: 124.8886 },
];

// Renders all municity dots for the active choropleth layer
function AllChoroplethDots({
  layerData,
}: {
  layerData: LayerResponse | undefined;
}) {
  if (!layerData?.layer_data.length) return null;
  return (
    <>
      {layerData.layer_data.map((pt) => {
        const pos = centroidMap.get(pt.psgc_code);
        if (!pos) return null;
        return (
          <CircleMarker
            key={pt.psgc_code}
            center={[pos.lat, pos.lng]}
            radius={5}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#dc2626",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          />
        );
      })}
    </>
  );
}

// Renders count numbers on municity centroids
function ChoroplethNumbers({
  layerData,
}: {
  layerData: LayerResponse | undefined;
}) {
  if (!layerData?.layer_data.length) return null;
  return (
    <>
      {layerData.layer_data.map((pt) => {
        const pos = centroidMap.get(pt.psgc_code);
        if (!pos) return null;
        const icon = L.divIcon({
          html: `<span style="font-size:10px;font-weight:700;color:#991b1b;text-shadow:0 1px 2px rgba(255,255,255,0.9);white-space:nowrap">${pt.count.toLocaleString()}</span>`,
          className: "",
          iconAnchor: [0, 0],
        });
        return (
          <Marker
            key={`num-${pt.psgc_code}`}
            position={[pos.lat, pos.lng]}
            icon={icon}
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Disaster layer helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<string, string> = {
  low: "#22c55e", // green
  medium: "#f97316", // orange
  high: "#ef4444", // red
};

function severityColor(s: string): string {
  return SEVERITY_COLOR[s] ?? "#94a3b8";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

// Renders live earthquake markers from the backend API
function EarthquakeLayer() {
  const enabled = useDisasterStore((s) => s.earthquakesEnabled);
  const { data: response } = useQuery({
    queryKey: ["disasters", "earthquake"],
    queryFn: () => disasterApi.list({ type: "earthquake", limit: 200 }),
    enabled,
    staleTime: 1000 * 60 * 10,
    refetchInterval: enabled ? 1000 * 60 * 10 : false,
  });

  if (!enabled) return null;
  const events: DisasterEvent[] = response?.data ?? [];

  return (
    <>
      {events.map((eq) => {
        if (eq.lat === null || eq.lng === null) return null;
        const mag = eq.metrics?.magnitude ?? 1;
        const color = severityColor(eq.severity);
        const label = mag >= 1 ? mag.toFixed(1) : "";
        const size = mag >= 5 ? 30 : mag >= 3 ? 26 : 22;
        const half = size / 2;
        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible"><div class="disaster-marker__ring" style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.45;"></div><div class="disaster-marker__ring disaster-marker__ring--slow" style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;"></div><div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9px;font-weight:700;color:#fff;box-shadow:0 4px 14px ${color}80,0 1px 4px rgba(0,0,0,0.22);">${label}</div></div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [half, half],
        });
        return (
          <Marker key={eq.external_id} position={[eq.lat, eq.lng]} icon={icon}>
            <Popup>
              <strong>{eq.title}</strong>
              <br />
              {eq.location_label && (
                <span>
                  {eq.location_label}
                  <br />
                </span>
              )}
              {eq.metrics?.depth_km != null && (
                <span>
                  Depth: {eq.metrics.depth_km} km
                  <br />
                </span>
              )}
              <span className="text-xs text-gray-500">
                {timeAgo(eq.event_started_at)}
              </span>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Renders GDACS disaster alerts from the backend API
function GdacsLayer() {
  const enabled = useDisasterStore((s) => s.earthquakesEnabled); // will have own toggle in sidebar
  const { data: response } = useQuery({
    queryKey: ["disasters", "gdacs"],
    queryFn: () => disasterApi.list({ source: "GDACS", limit: 100 }),
    enabled,
    staleTime: 1000 * 60 * 15,
    refetchInterval: enabled ? 1000 * 60 * 15 : false,
  });

  if (!enabled) return null;
  const events: DisasterEvent[] = response?.data ?? [];

  return (
    <>
      {events.map((ev) => {
        if (ev.lat === null || ev.lng === null) return null;
        const color = severityColor(ev.severity);
        const gdacsIcon = L.divIcon({
          html: `<div style="width:18px;height:18px;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible"><div class="disaster-marker__ring" style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.45;"></div><div class="disaster-marker__ring disaster-marker__ring--slow" style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.25;"></div><div style="position:relative;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 4px 14px ${color}80,0 1px 4px rgba(0,0,0,0.22);"></div></div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        return (
          <Marker
            key={ev.external_id}
            position={[ev.lat, ev.lng]}
            icon={gdacsIcon}
          >
            <Popup>
              <strong>{ev.title}</strong>
              <br />
              {ev.location_label && (
                <span>
                  {ev.location_label}
                  <br />
                </span>
              )}
              <span className="text-xs">
                Alert: {ev.metrics?.alert_level ?? ev.severity}
              </span>
              <br />
              <span className="text-xs text-gray-500">
                {timeAgo(ev.event_started_at)}
              </span>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Renders ReliefWeb humanitarian reports (PH centroid markers)
function ReliefWebLayer() {
  const enabled = useDisasterStore((s) => s.floodsEnabled); // will have own toggle
  const { data: response } = useQuery({
    queryKey: ["disasters", "reliefweb"],
    queryFn: () => disasterApi.list({ source: "ReliefWeb", limit: 50 }),
    enabled,
    staleTime: 1000 * 60 * 30,
    refetchInterval: false,
  });

  if (!enabled) return null;
  const events: DisasterEvent[] = response?.data ?? [];

  return (
    <>
      {events.map((ev) => {
        if (ev.lat === null || ev.lng === null) return null;
        return (
          <Marker
            key={ev.external_id}
            position={[ev.lat, ev.lng]}
            icon={L.divIcon({
              html: `<div style="width:16px;height:16px;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible"><div class="disaster-marker__ring" style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.45;animation-duration:3s;"></div><div style="position:relative;width:16px;height:16px;border-radius:50%;background:#3b82f6;box-shadow:0 4px 14px rgba(59,130,246,0.65),0 1px 4px rgba(0,0,0,0.22);"></div></div>`,
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup maxWidth={300}>
              <div
                style={{
                  fontFamily:
                    "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                }}
              >
                {ev.metrics?.url ? (
                  <a
                    href={ev.metrics.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      textDecoration: "none",
                      lineHeight: 1.3,
                      display: "block",
                      marginBottom: "6px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.textDecoration = "underline")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.textDecoration = "none")
                    }
                  >
                    {ev.title}
                  </a>
                ) : (
                  <strong
                    style={{
                      fontSize: "12px",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    {ev.title}
                  </strong>
                )}
                {ev.summary && (
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#475569",
                      margin: "0 0 8px",
                      lineHeight: 1.4,
                    }}
                  >
                    {ev.summary.length > 120
                      ? ev.summary.slice(0, 120) + "…"
                      : ev.summary}
                  </p>
                )}
                {ev.metrics?.url && (
                  <a
                    href={ev.metrics.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#3b82f6",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      textDecoration: "none",
                    }}
                  >
                    Open on ReliefWeb
                    <svg
                      width="10"
                      height="10"
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
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Renders static Philippine active volcano markers
function VolcanoLayer() {
  const enabled = useDisasterStore((s) => s.volcanoesEnabled);
  if (!enabled) return null;
  return (
    <>
      {PH_VOLCANOES.map((v) => {
        const icon = L.divIcon({
          html: `<div style="width:20px;height:20px;position:relative;display:flex;align-items:center;justify-content:center;overflow:visible"><div class="disaster-marker__ring" style="position:absolute;inset:0;border-radius:50%;background:#7c3aed;opacity:0.45;animation-duration:3.5s;"></div><div class="disaster-marker__ring disaster-marker__ring--slow" style="position:absolute;inset:0;border-radius:50%;background:#7c3aed;opacity:0.25;animation-duration:3.5s;"></div><div style="position:relative;width:20px;height:20px;border-radius:50%;background:#7c3aed;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:900;color:#fff;box-shadow:0 4px 14px rgba(124,58,237,0.65),0 1px 4px rgba(0,0,0,0.22);">!</div></div>`,
          className: "",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        return (
          <Marker key={v.name} position={[v.lat, v.lng]} icon={icon}>
            <Popup>
              <strong>{v.name}</strong>
              <br />
              <span className="text-xs text-gray-500">Active Volcano</span>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// Placeholder for typhoon overlay
function TyphoonLayer() {
  const enabled = useDisasterStore((s) => s.typhoonsEnabled);
  if (!enabled) return null;
  return null; // Real-time typhoon data integration pending
}

// Placeholder for flood overlay
function FloodLayer() {
  const enabled = useDisasterStore((s) => s.floodsEnabled);
  if (!enabled) return null;
  return null; // Flood data integration pending
}

// Registers map click handler for background deselect
function MapInstanceCapture() {
  useMapEvents({
    click() {
      useMapStore.getState().setSelectedLocation(null);
      useFilterStore.getState().setActiveRegion(null);
      useDatasetLayerStore.getState().setChoroplethSelection(null);
    },
  });
  return null;
}

interface GeoFeatureProperties {
  ADM1_PCODE?: string;
  ADM2_PCODE?: string;
  ADM3_PCODE?: string;
  ADM1_EN?: string;
  ADM2_EN?: string;
  ADM3_EN?: string;
  name?: string;
}

const defaultStyle: PathOptions = {
  color: "#94a3b8",
  weight: 1,
  fillColor: "#cbd5e1",
  fillOpacity: 0.35,
};

const hoverStyle: PathOptions = {
  fillColor: "#fca5a5",
  fillOpacity: 0.5,
  weight: 1.5,
  color: "#dc2626",
};

const selectedStyle: PathOptions = {
  fillColor: "#ef4444",
  fillOpacity: 0.35,
  weight: 2,
  color: "#b91c1c",
};

// ---------------------------------------------------------------------------
// Choropleth colour scale (light red → deep red) — 5 buckets
// ---------------------------------------------------------------------------
const CHOROPLETH_COLORS = [
  "#fee2e2", // red-100
  "#fca5a5", // red-300
  "#f87171", // red-400
  "#dc2626", // red-600
  "#991b1b", // red-800
];

function choroplethStyle(
  psgcCode: string,
  layerMap: Map<string, LayerDataPoint>,
  maxVal: number,
): PathOptions {
  const point = layerMap.get(psgcCode);
  if (!point || maxVal === 0)
    return {
      ...defaultStyle,
      fillColor: CHOROPLETH_COLORS[0],
      fillOpacity: 0.5,
    };
  const ratio = point.display_value / maxVal;
  const idx = Math.min(
    Math.floor(ratio * CHOROPLETH_COLORS.length),
    CHOROPLETH_COLORS.length - 1,
  );
  return {
    color: "#dc2626",
    weight: 1,
    fillColor: CHOROPLETH_COLORS[idx],
    fillOpacity: 0.65,
  };
}

// ---------------------------------------------------------------------------
// Module-level helper: read fresh choropleth style from query cache.
// Used in mouse-event handlers to avoid stale-closure bugs.
// ---------------------------------------------------------------------------
function getChoroplethStyleFromCache(psgcCode: string): PathOptions {
  const layerId = useDatasetLayerStore.getState().activeLayerDatasetId;
  const showChoropleth = useMapStore.getState().showChoropleth;
  if (!layerId || !showChoropleth) return defaultStyle;

  const cached = queryClient.getQueryData<LayerResponse>(["layer", layerId]);
  if (!cached?.layer_data.length) return defaultStyle;

  const level = useMapStore.getState().mapAreaLevel;
  const m = new Map<string, LayerDataPoint>();

  if (level === "municity") {
    for (const pt of cached.layer_data) m.set(pt.psgc_code, pt);
  } else if (level === "province") {
    for (const pt of cached.layer_data) {
      const provCode = pt.psgc_code.substring(0, 4) + "00000";
      const existing = m.get(provCode);
      if (existing) {
        existing.count += pt.count;
        existing.display_value += pt.display_value;
      } else {
        m.set(provCode, { ...pt, psgc_code: provCode });
      }
    }
  } else {
    for (const pt of cached.layer_data) {
      const regCode = pt.psgc_code.substring(0, 2) + "0000000";
      const existing = m.get(regCode);
      if (existing) {
        existing.count += pt.count;
        existing.display_value += pt.display_value;
      } else {
        m.set(regCode, { ...pt, psgc_code: regCode });
      }
    }
  }

  const mv = Math.max(...cached.layer_data.map((p) => p.display_value), 1);
  return choroplethStyle(psgcCode, m, mv);
}

export default function MapCanvas() {
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);
  const showChoropleth = useMapStore((s) => s.showChoropleth);
  const showDots = useMapStore((s) => s.showDots);
  const showNumbers = useMapStore((s) => s.showNumbers);
  const activeRegion = useFilterStore((s) => s.activeRegion);
  const activeLayerDatasetId = useDatasetLayerStore(
    (s) => s.activeLayerDatasetId,
  );
  const choroplethSelection = useDatasetLayerStore(
    (s) => s.choroplethSelection,
  );
  const setChoroplethSelection = useDatasetLayerStore(
    (s) => s.setChoroplethSelection,
  );
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  // Bumped after every addData() so the choropleth style effect reruns immediately
  const [geoVersion, setGeoVersion] = useState(0);

  // Draggable popup position (set when a choropleth area is clicked)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Fetch choropleth layer data
  const { data: layerData } = useQuery({
    queryKey: ["layer", activeLayerDatasetId],
    queryFn: () => fetchDatasetLayer(activeLayerDatasetId!),
    enabled: !!activeLayerDatasetId,
    staleTime: 1000 * 60 * 5,
  });

  // Build a PSGC → point map aggregated for the current map level.
  // Municity data (9-digit) is rolled up to province (prefix 4 digits + 00000)
  // or region (prefix 2 digits + 0000000) depending on mapAreaLevel.
  const layerMap = useCallback((): Map<string, LayerDataPoint> => {
    const m = new Map<string, LayerDataPoint>();
    if (!layerData) return m;

    if (mapAreaLevel === "municity") {
      // Direct: psgc_code matches the GeoJSON ADM3 code
      for (const pt of layerData.layer_data) m.set(pt.psgc_code, pt);
    } else if (mapAreaLevel === "province") {
      // Roll up: derive province code = first 4 digits + "00000"
      for (const pt of layerData.layer_data) {
        const provCode = pt.psgc_code.substring(0, 4) + "00000";
        const existing = m.get(provCode);
        if (existing) {
          existing.count += pt.count;
          existing.display_value += pt.display_value;
        } else {
          m.set(provCode, { ...pt, psgc_code: provCode });
        }
      }
    } else {
      // Region: derive region code = first 2 digits + "0000000"
      for (const pt of layerData.layer_data) {
        const regCode = pt.psgc_code.substring(0, 2) + "0000000";
        const existing = m.get(regCode);
        if (existing) {
          existing.count += pt.count;
          existing.display_value += pt.display_value;
        } else {
          m.set(regCode, { ...pt, psgc_code: regCode });
        }
      }
    }
    return m;
  }, [layerData, mapAreaLevel]);

  const maxVal = layerData
    ? Math.max(...layerData.layer_data.map((p) => p.display_value), 1)
    : 1;

  // When layer data loads, auto-derive dominant region and set it so the
  // correct GeoJSON tiles (municity/province) load automatically.
  useEffect(() => {
    if (!layerData?.layer_data.length) return;
    const currentRegion = useFilterStore.getState().activeRegion;
    if (currentRegion) return; // respect user's existing selection
    const prefixCounts: Record<string, number> = {};
    for (const pt of layerData.layer_data) {
      const prefix = pt.psgc_code.substring(0, 2);
      prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
    }
    const topPrefix = Object.entries(prefixCounts).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0];
    if (topPrefix) {
      useFilterStore.getState().setActiveRegion(topPrefix + "0000000");
    }
  }, [layerData]);

  // Initialise popup position when a new selection is made
  useEffect(() => {
    if (choroplethSelection) {
      // Offset slightly from click point so cursor is on the drag handle
      setPopupPos({
        x: Math.max(8, choroplethSelection.x - 120),
        y: Math.max(8, choroplethSelection.y - 200),
      });
    } else {
      setPopupPos(null);
    }
  }, [choroplethSelection]);

  // Re-apply styles when selectedLocation or layer data changes
  useEffect(() => {
    if (!geoJsonRef.current) return;
    const lm = layerMap();
    geoJsonRef.current.eachLayer((layer) => {
      const l = layer as L.Path & { feature?: GeoJSON.Feature };
      const props = l.feature?.properties as GeoFeatureProperties | undefined;
      // Pick the PCODE that matches the current level
      const rawCode =
        mapAreaLevel === "region"
          ? (props?.ADM1_PCODE ?? "")
          : mapAreaLevel === "province"
            ? (props?.ADM2_PCODE ?? "")
            : (props?.ADM3_PCODE ?? props?.ADM2_PCODE ?? "");
      const code = rawCode.startsWith("PH") ? rawCode.slice(2) : rawCode;
      l.setStyle(
        code === selectedLocation?.psgcCode
          ? selectedStyle
          : activeLayerDatasetId && showChoropleth
            ? choroplethStyle(code, lm, maxVal)
            : defaultStyle,
      );
    });
  }, [
    selectedLocation,
    mapAreaLevel,
    layerData,
    activeLayerDatasetId,
    showChoropleth,
    maxVal,
    layerMap,
    geoVersion,
  ]);

  // Load GeoJSON whenever level or (for municity) activeRegion changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!geoJsonRef.current) return;

      setGeoLoading(true);
      setGeoError(null);

      try {
        if (mapAreaLevel === "region") {
          const data = await fetchGeoJSON(
            `${BASE_GEO_URL}regions/hires/regions.0.1.json`,
          );
          if (cancelled) return;
          if (!data || data.features.length === 0) {
            setGeoError(
              "Could not load region boundaries. Check your connection and try again.",
            );
            return;
          }
          geoJsonRef.current.clearLayers();
          geoJsonRef.current.addData(data);
          setGeoVersion((v) => v + 1);
        } else if (mapAreaLevel === "province") {
          const urls = PROVINCE_REGION_CODES.map(
            (code) =>
              `${BASE_GEO_URL}provinces/hires/provinces-region-ph${code}.0.1.json`,
          );
          const results = await Promise.all(urls.map(fetchGeoJSON));
          if (cancelled) return;
          const merged = mergeCollections(results);
          if (merged.features.length === 0) {
            setGeoError(
              "Could not load province boundaries. Check your connection and try again.",
            );
            return;
          }
          geoJsonRef.current.clearLayers();
          geoJsonRef.current.addData(merged);
          setGeoVersion((v) => v + 1);
        } else if (mapAreaLevel === "municity") {
          if (!activeRegion) {
            geoJsonRef.current.clearLayers();
            setGeoLoading(false);
            return;
          }
          // Match province files by first 2 digits of region code
          const prefix = activeRegion.substring(0, 2);
          const codes = MUNICITY_PROVINCE_CODES.filter((c) =>
            c.startsWith(prefix),
          );
          const urls = codes.map(
            (code) =>
              `${BASE_GEO_URL}municties/hires/municities-province-ph${code}.0.1.json`,
          );
          const results = await Promise.all(urls.map(fetchGeoJSON));
          if (cancelled) return;
          const merged = mergeCollections(results);
          if (merged.features.length === 0) {
            setGeoError(
              "Could not load city/municipality boundaries. Check your connection and try again.",
            );
            return;
          }
          centroidMap.clear();
          geoJsonRef.current.clearLayers();
          geoJsonRef.current.addData(merged);
          setGeoVersion((v) => v + 1);
        }
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mapAreaLevel, activeRegion, loadKey]);

  // onEachFeature is captured by Leaflet at layer-creation time and reused for
  // all subsequent addData() calls. Use getState() throughout to avoid stale
  // closures — the ref object itself is stable across renders.
  function onEachFeature(feature: GeoJSON.Feature, layer: Layer) {
    const props = feature.properties as GeoFeatureProperties;

    // Read level at bind time (called synchronously during addData)
    const level = useMapStore.getState().mapAreaLevel;

    // Pick the area PCODE for this level
    const areaRaw =
      level === "region"
        ? (props.ADM1_PCODE ?? "")
        : level === "province"
          ? (props.ADM2_PCODE ?? "")
          : (props.ADM3_PCODE ?? props.ADM2_PCODE ?? "");
    const psgcCode = areaRaw.startsWith("PH") ? areaRaw.slice(2) : areaRaw;

    // Human-readable name for this level
    const name =
      level === "region"
        ? (props.ADM1_EN ?? props.name ?? "Unknown")
        : level === "province"
          ? (props.ADM2_EN ?? props.ADM1_EN ?? props.name ?? "Unknown")
          : (props.ADM3_EN ?? props.ADM2_EN ?? props.name ?? "Unknown");

    // For province/municity features, also capture the parent region code
    const regionRaw = props.ADM1_PCODE ?? "";
    const regionCode = regionRaw.startsWith("PH")
      ? regionRaw.slice(2)
      : regionRaw;

    // Store centroid for dot rendering (municity level only)
    if (level === "municity") {
      const bounds = (layer as L.Polygon).getBounds?.();
      if (bounds) {
        const c = bounds.getCenter();
        centroidMap.set(psgcCode, { lat: c.lat, lng: c.lng });
      }
    }

    const path = layer as L.Path;

    path.on("mouseover", () => {
      const isSelected =
        useMapStore.getState().selectedLocation?.psgcCode === psgcCode;
      if (!isSelected) path.setStyle(hoverStyle);
    });

    path.on("mouseout", () => {
      const isSelected =
        useMapStore.getState().selectedLocation?.psgcCode === psgcCode;
      if (!isSelected) {
        // Restore correct style: choropleth (from cache), or default
        path.setStyle(getChoroplethStyleFromCache(psgcCode));
      }
    });

    path.on("click", (e: LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);

      geoJsonRef.current?.eachLayer((l) => {
        (l as L.Path).setStyle(defaultStyle);
      });
      path.setStyle(selectedStyle);

      const bounds = (layer as L.Polygon).getBounds();
      const center = bounds.getCenter();
      const level = useMapStore.getState().mapAreaLevel;

      useMapStore.getState().setSelectedLocation({
        psgcCode,
        name,
        type: GEO_LEVEL_TYPES[level],
        lat: center.lat,
        lng: center.lng,
      });

      // Store selection for the draggable choropleth popup + dot marker
      const dsId = useDatasetLayerStore.getState().activeLayerDatasetId;
      if (dsId) {
        const cached = queryClient.getQueryData<LayerResponse>(["layer", dsId]);
        // Aggregate all records whose psgc_code starts with the area prefix
        const prefix =
          level === "region"
            ? psgcCode.substring(0, 2)
            : level === "province"
              ? psgcCode.substring(0, 4)
              : psgcCode; // municity: exact match
        const matching = (cached?.layer_data ?? []).filter((p) =>
          p.psgc_code.startsWith(prefix),
        );
        const aggCount = matching.reduce((s, p) => s + p.count, 0);
        // Merge tooltip breakdowns across matching areas
        const mergedTooltip: Record<string, Record<string, number>> = {};
        for (const p of matching) {
          for (const [key, val] of Object.entries(p.tooltip)) {
            if (key === "Total") continue;
            if (typeof val === "object" && val !== null) {
              mergedTooltip[key] ??= {};
              for (const [v, cnt] of Object.entries(
                val as Record<string, number>,
              )) {
                mergedTooltip[key][v] = (mergedTooltip[key][v] ?? 0) + cnt;
              }
            }
          }
        }
        useDatasetLayerStore.getState().setChoroplethSelection({
          psgcCode,
          prefix,
          name,
          lat: center.lat,
          lng: center.lng,
          count: aggCount,
          tooltip: mergedTooltip,
          x: e.containerPoint.x,
          y: e.containerPoint.y,
        } satisfies ChoroplethSelection);
      }

      if (level === "region") {
        useFilterStore.getState().setActiveRegion(psgcCode);
      } else if (level === "province") {
        // Derive parent region from ADM1_PCODE; fall back to code prefix
        const derived = regionCode || psgcCode.substring(0, 2) + "0000000";
        useFilterStore.getState().setActiveRegion(derived);
        useFilterStore.getState().setActiveProvince(psgcCode);
      } else if (level === "municity") {
        useFilterStore.getState().setActiveCityMuni(psgcCode);
      }
    });
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={PH_CENTER}
        zoom={6}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        <GeoJSON
          ref={geoJsonRef}
          data={
            { type: "FeatureCollection", features: [] } as GeoJSON.GeoJsonObject
          }
          style={defaultStyle}
          onEachFeature={onEachFeature}
        />
        {activeLayerDatasetId && showDots && (
          <AllChoroplethDots layerData={layerData} />
        )}
        {activeLayerDatasetId && showNumbers && (
          <ChoroplethNumbers layerData={layerData} />
        )}
        <EarthquakeLayer />
        <GdacsLayer />
        <ReliefWebLayer />
        <VolcanoLayer />
        <TyphoonLayer />
        <FloodLayer />
        <MapInstanceCapture />
      </MapContainer>

      {/* Loading overlay */}
      {geoLoading && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[800] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-slate-200 backdrop-blur-sm">
            <NestLogo width={52} />
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-red-500"
                  style={{
                    animation: `nest-pulse-soft 1.1s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              ))}
              <span className="ml-1.5 text-xs font-medium text-slate-600">
                Loading map areas…
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Municity hint — shown when no region is selected */}
      {mapAreaLevel === "municity" &&
        !activeRegion &&
        !geoLoading &&
        !geoError && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[800] w-[min(340px,90%)] -translate-x-1/2">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/90 px-4 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur-sm">
              <svg
                className="h-4 w-4 shrink-0 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs text-slate-600">
                Select a <span className="font-semibold">Region</span> in the
                Filters panel to view cities &amp; municipalities.
              </p>
            </div>
          </div>
        )}

      {/* Error banner */}
      {geoError && (
        <div className="absolute left-1/2 top-4 z-[800] w-[min(420px,90%)] -translate-x-1/2">
          <div className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-red-200">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-red-700">
                Map areas could not be loaded
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{geoError}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setLoadKey((k) => k + 1)}
                className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setGeoError(null)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Choropleth legend */}
      {activeLayerDatasetId && layerData && (
        <div className="pointer-events-none absolute bottom-8 right-4 z-[800]">
          <div className="rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-slate-200 backdrop-blur-sm min-w-[160px]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
              {layerData.dataset.name}
            </p>
            <div className="flex items-center gap-1.5 mb-1">
              {CHOROPLETH_COLORS.map((c, i) => (
                <div
                  key={i}
                  className="h-3 flex-1 rounded-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>0</span>
              <span>{maxVal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Draggable choropleth detail popup ── */}
      {choroplethSelection &&
        popupPos &&
        (() => {
          const { count } = choroplethSelection;
          return (
            <div
              className="absolute z-[900] w-72 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 select-none overflow-hidden"
              style={{ left: popupPos.x, top: popupPos.y }}
              onPointerDown={(e) => {
                // Only drag on the card itself, not interactive children
                if ((e.target as HTMLElement).closest("a,button")) return;
                dragState.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: popupPos.x,
                  origY: popupPos.y,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragState.current) return;
                setPopupPos({
                  x:
                    dragState.current.origX +
                    (e.clientX - dragState.current.startX),
                  y:
                    dragState.current.origY +
                    (e.clientY - dragState.current.startY),
                });
              }}
              onPointerUp={() => {
                dragState.current = null;
              }}
            >
              {/* Drag handle / header */}
              <div className="flex items-center gap-2 bg-red-600 px-4 py-3 cursor-grab active:cursor-grabbing">
                <svg
                  className="h-3.5 w-3.5 text-red-300 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 9h.01M8 15h.01M16 9h.01M16 15h.01M12 9h.01M12 15h.01"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {choroplethSelection.name}
                  </p>
                  {layerData && (
                    <p className="text-[9px] text-red-200 truncate">
                      {layerData.dataset.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setChoroplethSelection(null)}
                  className="shrink-0 rounded-full p-1 text-red-200 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Stats */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Total Records
                  </span>
                  <span className="text-2xl font-bold text-red-600 tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Footer — link to records */}
              {activeLayerDatasetId && (
                <div className="px-4 pb-3">
                  <Link
                    to={`/datasets/${activeLayerDatasetId}/records`}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    View all records
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
