import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDataTypes, type Dataset, type DatasetRecord } from "../../services/api/datasetApi";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore } from "../../stores/useMapStore";
import { useMapSourceStore } from "../../stores/useMapSourceStore";
import { canManageDatasets } from "../../lib/datasetPermissions";
import { useExplore } from "../../hooks/useExplore";
import { defaultDatasetFor, optionForDataset, optionLabel } from "../../lib/politicalExplore";
import type { PoliticalArea } from "../../lib/politicalArea";
import type { AreaLevel } from "../../lib/exploreSummary";
import AreaPicker from "./AreaPicker";
import RecordTable from "./RecordTable";
import RecordForm from "./RecordForm";
import DataTypeForm from "./DataTypeForm";

type View =
  | { kind: "list" | "newType" }
  | { kind: "editType" | "add"; dataset: Dataset }
  | { kind: "edit"; dataset: Dataset; record: DatasetRecord };

const secondaryButton = "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold";

export default function DatasetWorkspaceSidebar() {
  const areaFilters = useFilterStore();
  const selection: PoliticalArea = {
    region: areaFilters.activeRegion,
    province: areaFilters.activeProvince,
    city: areaFilters.activeCityMuni,
    barangay: areaFilters.activeBarangay,
  };
  const { area, dataset, prefix, unmatched } = useExplore({ workspace: true });
  const datasetId = useDatasetLayerStore((state) => state.activeLayerDatasetId);
  const canManage = useAuthStore((state) => canManageDatasets(state.user));
  const [view, setView] = useState<View>({ kind: "list" });
  const [message, setMessage] = useState("");
  const cache = useQueryClient();

  const available = useQuery({
    queryKey: ["data-types", prefix ?? "all"],
    queryFn: () => fetchDataTypes(prefix),
    staleTime: 30_000,
  });
  const current = optionForDataset(available.data ?? [], datasetId);
  const selected = dataset?.is_active && current ? dataset : undefined;
  const canManageRecords = canManage && !!selected;

  function chooseArea(next: PoliticalArea, level: AreaLevel) {
    const setters = {
      region: areaFilters.setActiveRegion,
      province: areaFilters.setActiveProvince,
      city: areaFilters.setActiveCityMuni,
      barangay: areaFilters.setActiveBarangay,
    };
    setters[level](next[level]);
    useMapStore
      .getState()
      .setMapAreaLevel(next.city ? "municity" : next.province ? "province" : "region");
  }

  function chooseDataset(id: number | null, level?: string) {
    useMapSourceStore.getState().setSource("imported");
    useDatasetLayerStore.getState().setActiveLayer(id, level);
    setMessage("");
  }

  function chooseType(key: string) {
    const option = available.data?.find((item) => item.key === key);
    const list = option?.datasets.find((item) => item.id === defaultDatasetFor(option));
    chooseDataset(list?.id ?? null, list?.psgc_level);
  }

  function back() {
    setView({ kind: "list" });
  }

  function refresh(id?: number) {
    void cache.invalidateQueries({ queryKey: ["data-types"] });
    void cache.invalidateQueries({ queryKey: ["datasets"] });
    if (id) {
      cache.removeQueries({ queryKey: ["dataset-workspace-records", id], type: "inactive" });
      void cache.invalidateQueries({ queryKey: ["map-panel-records", id] });
      void cache.invalidateQueries({ queryKey: ["layer", id] });
      void cache.invalidateQueries({ queryKey: ["dataset", id] });
    }
  }

  const recordArea =
    selected && selected.layer_config.show_on_map !== false
      ? {
          ...selection,
          city: selected.psgc_level === "province" ? null : selection.city,
          barangay: selected.psgc_level === "barangay" ? selection.barangay : null,
        }
      : selection;

  return (
    <div className="space-y-5 p-5">
      {canManage && (view.kind === "newType" || view.kind === "editType") ? (
        <DataTypeForm
          dataset={view.kind === "editType" ? view.dataset : undefined}
          onBack={back}
          onSaved={(saved) => {
            cache.setQueryData(["dataset", saved.id], saved);
            chooseDataset(saved.id, saved.psgc_level);
            refresh(saved.id);
            setMessage(view.kind === "newType" ? "Record category created." : "Record category updated.");
            back();
          }}
          onDeleted={(result) => {
            chooseDataset(null);
            refresh();
            setMessage(result);
            back();
          }}
        />
      ) : canManage && (view.kind === "add" || view.kind === "edit") ? (
        <RecordForm
          dataset={view.dataset}
          record={view.kind === "edit" ? view.record : undefined}
          initialArea={recordArea}
          onBack={back}
          onSaved={(result) => {
            refresh(view.dataset.id);
            setMessage(result);
            back();
          }}
        />
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-slate-900">Area</legend>
            <AreaPicker mode="filter" area={selection} onChange={chooseArea} />
          </fieldset>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">
              Record category
              <select
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                value={current?.key ?? ""}
                disabled={available.isPending || available.isError}
                onChange={(event) => chooseType(event.target.value)}
              >
                <option value="">
                  {available.isPending ? "Loading record categories…" : "Choose a record category"}
                </option>
                {available.data?.map((option) => (
                  <option key={option.key} value={option.key}>
                    {optionLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            {current && current.datasets.length > 1 && (
              <label className="block text-xs font-medium text-slate-700">
                Source list
                <select
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                  value={datasetId ?? ""}
                  onChange={(event) => {
                    const list = current.datasets.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    if (list) chooseDataset(list.id, list.psgc_level);
                  }}
                >
                  {current.datasets.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name} ({list.record_count.toLocaleString()})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {available.isError && (
            <button
              type="button"
              className="text-sm text-team underline"
              onClick={() => void available.refetch()}
            >
              Could not load record categories. Try again
            </button>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-team px-3 py-2 text-sm font-semibold text-team-foreground disabled:opacity-50"
                disabled={!canManageRecords}
                onClick={() => {
                  if (selected) setView({ kind: "add", dataset: selected });
                }}
              >
                Add record
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setView({ kind: "newType" })}
              >
                New record category
              </button>
              {selected?.political_entry && (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setView({ kind: "editType", dataset: selected })}
                >
                  Edit record category
                </button>
              )}
            </div>
          )}
          {message && (
            <p role="status" className="text-sm font-medium text-emerald-800">
              {message}
            </p>
          )}
          {selected ? (
            <RecordTable
              key={`${selected.id}:${prefix ?? ""}`}
              dataset={selected}
              area={area}
              prefix={prefix}
              unmatched={unmatched}
              onEdit={
                canManageRecords
                  ? (record) => setView({ kind: "edit", dataset: selected, record })
                  : undefined
              }
            />
          ) : (
            <p className="rounded-md border border-slate-200 p-4 text-sm text-slate-600">
              {available.data?.length === 0
                ? "No record categories available."
                : "Choose a record category to see its records."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
