import { create } from "zustand";

export type TrayTab = "results" | "totals" | "news" | "video" | "disasters";

interface TrayState {
  /** null means "no explicit choice yet": News when nothing is picked, Results once a dataset is. */
  tab: TrayTab | null;
  setTab: (tab: TrayTab | null) => void;
}

export const useTrayStore = create<TrayState>((set) => ({
  tab: null,
  setTab: (tab) => set({ tab }),
}));

export function defaultTrayTab(hasDataset: boolean): TrayTab {
  return hasDataset ? "results" : "news";
}
