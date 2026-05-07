import { create } from "zustand";

interface RssState {
  activeFeedId: number | null;
  setActiveFeedId: (id: number | null) => void;

  // Multiple feed mode
  multipleMode: boolean;
  setMultipleMode: (enabled: boolean) => void;
  selectedFeedIds: number[];
  toggleFeedSelection: (id: number) => void;
  setSelectedFeedIds: (ids: number[]) => void;
}

export const useRssStore = create<RssState>()((set) => ({
  activeFeedId: null,
  setActiveFeedId: (id) => set({ activeFeedId: id }),

  multipleMode: false,
  setMultipleMode: (enabled) => set({ multipleMode: enabled }),
  selectedFeedIds: [],
  toggleFeedSelection: (id) =>
    set((state) => ({
      selectedFeedIds: state.selectedFeedIds.includes(id)
        ? state.selectedFeedIds.filter((fid) => fid !== id)
        : [...state.selectedFeedIds, id],
    })),
  setSelectedFeedIds: (ids) => set({ selectedFeedIds: ids }),
}));
