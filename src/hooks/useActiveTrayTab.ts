import { useAuthStore } from "../stores/useAuthStore";
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

export function useActiveTrayTab(): TrayTabDef["id"] {
  const source = useEffectiveMapSource();
  const hasDataset =
    useDatasetLayerStore((s) => s.activeLayerDatasetId !== null) && source === "imported";
  const chosen = useTrayStore((s) => s.tab);
  const capabilities = useAuthStore((s) => s.user?.capabilities);
  const fallback = defaultTrayTab(hasDataset);
  const wanted = chosen ?? fallback;
  const def = TRAY_TABS.find((t) => t.id === wanted);
  if (def?.capability && !capabilities?.includes(def.capability)) return "results";
  return wanted;
}
