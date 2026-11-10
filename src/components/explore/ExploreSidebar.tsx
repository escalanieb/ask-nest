import { useAuthStore } from "../../stores/useAuthStore";
import { useEffectiveMapSource, useMapSourceStore } from "../../stores/useMapSourceStore";
import { ElectionCountdown, Filters, TipasLayerSwitcher } from "../dashboard/SourceTools";
import AreaPicker from "./AreaPicker";
import NarrowFilters from "./NarrowFilters";
import PickDataset from "./PickDataset";
import Step from "./Step";

export default function ExploreSidebar() {
  const capabilities = useAuthStore((s) => s.user?.capabilities);
  const source = useEffectiveMapSource();
  const setSource = useMapSourceStore((s) => s.setSource);
  const both = !!capabilities?.includes("datasets.use") && !!capabilities.includes("tipas.use");

  return (
    <>
      <ElectionCountdown />
      {both && (
        <div
          className="flex gap-2 border-b border-slate-200 p-3"
          role="group"
          aria-label="Data source"
        >
          {(["imported", "tipas"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={source === s}
              onClick={() => setSource(s)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                source === s ? "bg-team text-white" : "border border-slate-200 text-slate-600"
              }`}
            >
              {s === "imported" ? "Imported data" : "TIPAS"}
            </button>
          ))}
        </div>
      )}
      {source === "none" && (
        <p className="p-4 text-xs text-slate-500">No data source is enabled for your team.</p>
      )}
      {source === "imported" && (
        <>
          <Step n={1} title="Pick what to look at" hint="Choose an event or list.">
            <PickDataset />
          </Step>
          <Step n={2} title="Narrow it down" hint="Where? Then who? Both are optional.">
            <div className="space-y-4">
              <AreaPicker />
              <NarrowFilters />
            </div>
          </Step>
        </>
      )}
      {source === "tipas" && (
        <>
          <TipasLayerSwitcher />
          <Filters />
        </>
      )}
    </>
  );
}
