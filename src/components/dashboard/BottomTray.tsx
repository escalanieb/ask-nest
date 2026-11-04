import { useAuthStore } from "../../stores/useAuthStore";
import { useTrayStore } from "../../stores/useTrayStore";
import { TRAY_TABS, useActiveTrayTab } from "../../hooks/useActiveTrayTab";
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

export default function BottomTray() {
  const active = useActiveTrayTab();
  const setTab = useTrayStore((s) => s.setTab);
  const user = useAuthStore((s) => s.user);
  const capabilities = user?.capabilities;
  const tabs = TRAY_TABS.filter((t) => !t.capability || capabilities?.includes(t.capability));

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden border-t-2 border-slate-300 bg-white"
      style={{ flex: 1 }}
    >
      <div
        role="tablist"
        aria-label="Panels"
        className="flex shrink-0 gap-1 border-b border-slate-200 bg-slate-50 px-2 pt-1.5"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md px-4 py-1.5 text-xs font-semibold ${
              active === t.id
                ? "border border-b-white border-slate-200 bg-white text-team"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-hidden">
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
    </div>
  );
}
