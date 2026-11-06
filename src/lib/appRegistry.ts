import { canManageDatasets } from "./datasetPermissions.ts";

export type AppIconKey = "map" | "datasets" | "insight" | "asc" | "tala";

export interface BuiltInApp {
  id: string;
  label: string;
  href: string;
  /** Internal routes use the router; everything else opens in a new tab. */
  internal: boolean;
  icon?: AppIconKey;
  /** Team capability required to see the tile. */
  capability?: string;
  /** Also requires an admin / data manager role. */
  datasetManagerOnly?: boolean;
}

// Built-in tools behave like preinstalled phone apps: defined here, never
// removable. Gates must match the route guards in App.tsx.
export const BUILT_IN_APPS: readonly BuiltInApp[] = [
  { id: "map", label: "Map", href: "/map", internal: true, icon: "map" },
  {
    id: "insight",
    label: "Insight",
    href: "/insight",
    internal: true,
    icon: "insight",
    capability: "insight.use",
  },
  { id: "asc", label: "ASC GPT", href: "/asc", internal: true, icon: "asc", capability: "ai.use" },
  {
    id: "datasets",
    label: "Datasets",
    href: "/datasets",
    internal: true,
    icon: "datasets",
    capability: "datasets.use",
    datasetManagerOnly: true,
  },
  { id: "tala", label: "TALA", href: "https://tala.asc-nest.org/", internal: false, icon: "tala" },
  {
    id: "tipas",
    label: "TIPAS",
    href: "https://tipas.asc-nest.org/",
    internal: false,
    capability: "tipas.use",
  },
  { id: "nexus", label: "NEXUS", href: "https://nexus.asc-nest.org/", internal: false },
  {
    id: "senate-watch",
    label: "Senate Watch",
    href: "https://senate-watch.asc-nest.org/",
    internal: false,
  },
];

interface AccessUser {
  role: string;
  capabilities?: readonly string[];
}

export function visibleBuiltIns(user: AccessUser | null | undefined): BuiltInApp[] {
  return BUILT_IN_APPS.filter(
    (app) =>
      (!app.capability || Boolean(user?.capabilities?.includes(app.capability))) &&
      (!app.datasetManagerOnly || canManageDatasets(user)),
  );
}

export const APP_LABEL_MAX = 30;

/**
 * Mirrors the backend rules: http(s) only, bare hosts get https://.
 * Returns the normalised URL, or null when the link is not acceptable.
 */
export function normalizeAppUrl(input: string): string | null {
  let url = input.trim();
  if (!url || /\s/.test(url)) return null;
  // No scheme (or "host:port"): assume https.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url) || /^[^/:?#]+:\d+(?:[/?#]|$)/.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname ? url : null;
  } catch {
    return null;
  }
}

/** Only http(s) links may be rendered as an href. */
export function isSafeHref(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

const TILE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0891b2",
  "#4f46e5",
] as const;

/** Stable colour for a label's letter tile. */
export function letterColor(label: string): string {
  let hash = 0;
  for (const char of label.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}
