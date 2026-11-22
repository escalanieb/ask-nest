import { useAuthStore } from "../stores/useAuthStore";
import { usesDatasetWorkspace } from "../lib/teamAccess";
import { useDatasetLayerStore } from "../stores/useDatasetLayerStore";
import { useEffectiveMapSource } from "../stores/useMapSourceStore";
import { defaultTrayTab, useTrayStore, type TrayTab } from "../stores/useTrayStore";

export interface TrayTabDef {
  id: TrayTab;
  label: string;
  capability?: string;
}

export const TRAY_TABS: TrayTabDef[] = [
  { id: "results", label: "Results" },
  { id: "totals", label: "Totals", capability: "analytics.use" },
  { id: "news", label: "News", capability: "rss.use" },
  { id: "video", label: "Video" },
  { id: "disasters", label: "Disasters" },
];

/**
 * Tabs this user can see. The dataset workspace already lists records in its own sidebar,
 * so those teams do not get the Results tab.
 */
export function visibleTrayTabs(
  user: { capabilities?: readonly string[] } | null | undefined,
): TrayTabDef[] {
  const workspace = usesDatasetWorkspace(user);
  return TRAY_TABS.filter(
    (t) =>
      (!t.capability || user?.capabilities?.includes(t.capability)) &&
      !(workspace && t.id === "results"),
  );
}

export function useTrayTabs(): TrayTabDef[] {
  const user = useAuthStore((s) => s.user);
  return visibleTrayTabs(user);
}

export function useActiveTrayTab(): TrayTabDef["id"] {
  const source = useEffectiveMapSource();
  const hasDataset =
    useDatasetLayerStore((s) => s.activeLayerDatasetId !== null) && source === "imported";
  const chosen = useTrayStore((s) => s.tab);
  const tabs = useTrayTabs();
  const wanted = chosen ?? defaultTrayTab(hasDataset);
  if (tabs.some((t) => t.id === wanted)) return wanted;
  // Not available to this team: Results for everyone who can see it (as before), else the
  // News tab, else the first tab left.
  const fallback = tabs.find((t) => t.id === "results") ?? tabs.find((t) => t.id === "news");
  return (fallback ?? tabs[0])?.id ?? "results";
}
