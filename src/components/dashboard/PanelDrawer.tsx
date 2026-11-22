import { useEffect, useRef, type RefObject } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useTrayStore } from "../../stores/useTrayStore";
import { useActiveTrayTab, useTrayTabs } from "../../hooks/useActiveTrayTab";
import AnalyticsPanel from "../widgets/AnalyticsPanel";
import DisasterPanel from "../widgets/DisasterPanel";
import RssFeedPanel from "../widgets/RssFeedPanel";
import VideoPanel from "../widgets/VideoPanel";
import DatasetRecordsPanel from "../map/DatasetRecordsPanel";
import { DisasterLayers, RssFeedSettings, VideoLinkManager } from "./SourceTools";

function Panel({ children, manage }: { children: React.ReactNode; manage?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {manage && (
        <div className="max-h-40 shrink-0 overflow-y-auto border-t border-slate-200 bg-white">
          {manage}
        </div>
      )}
    </div>
  );
}

/** Popups inside a panel that should handle Esc before the drawer does. */
const INNER_POPUP = '[role="dialog"], [role="listbox"], [role="menu"]';

/**
 * The panel opened from the navbar. It covers the area below the countdown and closes on
 * Esc, on the navbar button, or on a click elsewhere in `scope` (the right-hand panel).
 */
export default function PanelDrawer({ scope }: { scope: RefObject<HTMLElement | null> }) {
  const open = useTrayStore((s) => s.open);
  const close = useTrayStore((s) => s.close);
  const active = useActiveTrayTab();
  const tabs = useTrayTabs();
  const user = useAuthStore((s) => s.user);
  const drawer = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    heading.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest(INNER_POPUP)) return;
      close();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (drawer.current?.contains(target)) return;
      if (scope.current?.contains(target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      opener?.focus?.();
    };
  }, [open, close, scope]);

  if (!open) return null;
  const label = tabs.find((t) => t.id === active)?.label ?? "Panel";

  return (
    <section
      ref={drawer}
      aria-label={`${label} panel`}
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-white"
    >
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
        <h2 ref={heading} tabIndex={-1} className="text-sm font-semibold text-slate-900">
          {label}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label={`Close ${label} panel`}
          className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          ✕
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {active === "results" && <DatasetRecordsPanel />}
        {active === "totals" && <AnalyticsPanel />}
        {active === "news" && (
          <Panel manage={user?.role === "admin" ? <RssFeedSettings /> : undefined}>
            <RssFeedPanel />
          </Panel>
        )}
        {active === "video" && (
          <Panel manage={<VideoLinkManager />}>
            <VideoPanel />
          </Panel>
        )}
        {active === "disasters" && (
          <Panel manage={<DisasterLayers />}>
            <DisasterPanel />
          </Panel>
        )}
      </div>
    </section>
  );
}
