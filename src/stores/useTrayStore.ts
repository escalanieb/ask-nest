import { create } from "zustand";

export type TrayTab = "results" | "totals" | "news" | "video" | "disasters";

interface TrayState {
  /**
   * The panel last shown, kept while the drawer is closed. null means "no explicit choice
   * yet": News when nothing is picked, Results once a dataset is.
   */
  tab: TrayTab | null;
  /** Whether the panel drawer is showing. It starts closed on every page load. */
  open: boolean;
  /** Remember a panel without opening the drawer. */
  setTab: (tab: TrayTab | null) => void;
  /** Open the drawer on a panel. */
  show: (tab: TrayTab) => void;
  /** Navbar buttons: open that panel, or close the drawer when it is already showing. */
  toggle: (tab: TrayTab) => void;
  close: () => void;
}

export const useTrayStore = create<TrayState>((set, get) => ({
  tab: null,
  open: false,
  setTab: (tab) => set({ tab }),
  show: (tab) => set({ tab, open: true }),
  toggle: (tab) => {
    const { open, tab: current } = get();
    set(open && current === tab ? { open: false } : { tab, open: true });
  },
  close: () => set({ open: false }),
}));

export function defaultTrayTab(hasDataset: boolean): TrayTab {
  return hasDataset ? "results" : "news";
}
