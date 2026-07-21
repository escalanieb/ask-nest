import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoPlatform = "youtube" | "facebook";

export interface SavedVideoLink {
  id: string;
  name: string;
  url: string;
  platform: VideoPlatform;
}

interface VideoStore {
  // Persisted link library
  savedLinks: SavedVideoLink[];
  addLink: (link: Omit<SavedVideoLink, "id">) => void;
  removeLink: (id: string) => void;

  // Transient signal: sidebar → VideoPanel "load this now"
  pendingSource: { url: string; platform: VideoPlatform; name: string } | null;
  setPendingSource: (source: { url: string; platform: VideoPlatform; name: string } | null) => void;
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set) => ({
      savedLinks: [],
      addLink: (link) =>
        set((s) => ({
          savedLinks: [...s.savedLinks, { ...link, id: Date.now().toString() }],
        })),
      removeLink: (id) =>
        set((s) => ({
          savedLinks: s.savedLinks.filter((l) => l.id !== id),
        })),

      pendingSource: null,
      setPendingSource: (source) => set({ pendingSource: source }),
    }),
    {
      name: "video-links",
      // Only persist the link library; pendingSource is ephemeral
      partialize: (s) => ({ savedLinks: s.savedLinks }),
    },
  ),
);
