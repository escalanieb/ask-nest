import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WidgetLayout {
  id: string;
  type: "analytics" | "rss" | "records" | "video" | "disaster";
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface WorkspaceState {
  widgets: Record<string, WidgetLayout>;
  panelOrder: string[]; // ordered list of all widget IDs for the tray
  updateWidget: (id: string, layout: Partial<WidgetLayout>) => void;
  toggleWidget: (id: string) => void;
  deleteWidget: (id: string) => void;
  duplicateWidget: (id: string) => string; // Returns new widget ID
  reorderPanels: (newOrder: string[]) => void;
  resetLayout: () => void;
}

const defaultWidgets: Record<string, WidgetLayout> = {
  analyticsPanel: {
    id: "analyticsPanel",
    type: "analytics",
    x: 340,
    y: 0,
    width: 320,
    height: 240,
    visible: false,
  },
  rssFeedPanel: {
    id: "rssFeedPanel",
    type: "rss",
    x: 20,
    y: 20,
    width: 420,
    height: 520,
    visible: false,
  },
  recordsPanel: {
    id: "recordsPanel",
    type: "records",
    x: 20,
    y: 20,
    width: 500,
    height: 420,
    visible: false,
  },
  videoPanel: {
    id: "videoPanel",
    type: "video",
    x: 60,
    y: 60,
    width: 480,
    height: 340,
    visible: false,
  },
  disasterPanel: {
    id: "disasterPanel",
    type: "disaster",
    x: 80,
    y: 80,
    width: 480,
    height: 440,
    visible: false,
  },
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      panelOrder: ["analyticsPanel", "rssFeedPanel", "recordsPanel", "videoPanel", "disasterPanel"],
      reorderPanels: (newOrder) => set({ panelOrder: newOrder }),
      updateWidget: (id, layout) =>
        set((state) => ({
          widgets: {
            ...state.widgets,
            [id]: { ...state.widgets[id], ...layout },
          },
        })),
      toggleWidget: (id) =>
        set((state) => {
          const existing = state.widgets[id] ??
            defaultWidgets[id] ?? {
              id,
              type: "rss" as const,
              x: 20,
              y: 20,
              width: 420,
              height: 480,
              visible: false,
            };
          // Ensure the id is tracked in panelOrder (handles panels added after
          // the user's localStorage was last written).
          const panelOrder = state.panelOrder.includes(id)
            ? state.panelOrder
            : [...state.panelOrder, id];
          return {
            panelOrder,
            widgets: {
              ...state.widgets,
              [id]: { ...existing, visible: !existing.visible },
            },
          };
        }),
      deleteWidget: (id) =>
        set((state) => {
          const { [id]: removed, ...rest } = state.widgets;
          return {
            widgets: rest,
            panelOrder: state.panelOrder.filter((pid) => pid !== id),
          };
        }),
      duplicateWidget: (id) => {
        const state = get();
        const widget = state.widgets[id];
        if (!widget) return "";

        // Generate unique ID based on type and timestamp
        const newId = `${widget.type}-${Date.now()}`;
        const newWidget: WidgetLayout = {
          ...widget,
          id: newId,
          visible: true,
          // Offset position slightly so duplicate isn't exactly on top
          x: widget.x + 20,
          y: widget.y + 20,
        };

        // Insert duplicate right after the source in panelOrder
        const orderCopy = [...state.panelOrder];
        const srcIdx = orderCopy.indexOf(id);
        if (srcIdx >= 0) orderCopy.splice(srcIdx + 1, 0, newId);
        else orderCopy.push(newId);

        set((s) => ({
          widgets: { ...s.widgets, [newId]: newWidget },
          panelOrder: orderCopy,
        }));

        return newId;
      },
      resetLayout: () =>
        set({
          widgets: defaultWidgets,
          panelOrder: [
            "analyticsPanel",
            "rssFeedPanel",
            "recordsPanel",
            "videoPanel",
            "disasterPanel",
          ],
        }),
    }),
    {
      name: "workspace-layout",
      merge: (persisted, current) => {
        const persistedWidgets = (persisted as Partial<WorkspaceState>)?.widgets ?? {};
        // Deep-merge per widget so fields from defaultWidgets (e.g. `type`)
        // always win when the persisted entry is missing them.
        const mergedWidgets: Record<string, WidgetLayout> = {
          ...current.widgets,
        };
        for (const [id, pw] of Object.entries(persistedWidgets)) {
          mergedWidgets[id] = {
            ...(current.widgets[id] ?? {}),
            ...pw,
            // Ensure type is always set from the default (never lost to old localStorage)
            type: (current.widgets[id]?.type ?? pw.type) as WidgetLayout["type"],
          };
        }
        // Ensure any new panels added to defaults are appended to the
        // persisted order so they don't silently disappear after updates.
        const persistedOrder =
          (persisted as Partial<WorkspaceState>)?.panelOrder ?? current.panelOrder;
        const missingIds = current.panelOrder.filter((id) => !persistedOrder.includes(id));
        return {
          ...current,
          ...(persisted as Partial<WorkspaceState>),
          widgets: mergedWidgets,
          panelOrder: [...persistedOrder, ...missingIds],
        };
      },
    },
  ),
);
