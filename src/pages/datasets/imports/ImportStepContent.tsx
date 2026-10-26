import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { fetchImportTemplates, downloadDatasetFile } from "../../../services/api/datasetApi";
import type { Dataset } from "../../../services/api/datasetApi";
import { configurationForFile } from "../../../lib/guidedImport";
import type { useGuidedImport } from "./useGuidedImport";
import ImportFileStep, { inputClass, primaryClass, secondaryClass } from "./ImportFileStep";
import ImportDetailsStep from "./ImportDetailsStep";
import ImportColumnsStep from "./ImportColumnsStep";
import ImportLocationsStep from "./ImportLocationsStep";
import ImportReviewStep from "./ImportReviewStep";

export default function ImportStepContent({
  controller,
  datasets,
  team,
  viewMap,
}: {
  controller: ReturnType<typeof useGuidedImport>;
  datasets: Dataset[];
  team?: string;
  viewMap: () => void;
}) {
  const {
    flow,
    change,
    chooseFile,
    target,
    locations,
    patch,
    reviewPage,
    resolve,
    run,
    startOver,
  } = controller;
  const selected = datasets.find((d) => d.id === flow.target);
  const templates = useQuery({ queryKey: ["import-templates"], queryFn: fetchImportTemplates });
  const [template, setTemplate] = useState("");
  function applyTemplate() {
    const saved = templates.data?.find((t) => t.id === Number(template));
    if (!saved || !flow.config || !flow.inspection) return;
    const compatible = configurationForFile(flow.inspection, flow.file?.name ?? "", selected, {
      ...flow.config,
      columns: saved.configuration.columns,
      psgc_level: selected?.psgc_level ?? saved.configuration.psgc_level,
      location_source: saved.configuration.location_source ?? {},
      locations: {},
    });
    if (flow.file)
      chooseFile(
        flow.file,
        false,
        flow.inspection.sheets.includes(saved.configuration.sheet)
          ? saved.configuration.sheet
          : flow.inspection.sheet,
        saved.configuration.header_row,
        compatible,
      );
    else change(compatible);
  }

  return (
    <>
      {flow.step === 0 && (
        <ImportFileStep
          file={flow.file}
          inspection={flow.inspection}
          originalName={flow.session?.original_filename}
          onFile={chooseFile}
          onInspect={(sheet, row) => {
            if (flow.file) chooseFile(flow.file, false, sheet, row || undefined);
          }}
          reviewed={flow.sheets}
          onReviewed={(sheets) => patch({ sheets })}
        />
      )}
      {flow.step === 1 && flow.config && (
        <ImportDetailsStep
          config={flow.config}
          datasets={datasets}
          target={flow.target}
          onTarget={target}
          onChange={change}
        />
      )}
      {flow.step === 2 && flow.config && flow.inspection && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-700">
              Use saved team settings <span className="font-normal text-slate-400">(optional)</span>
              <select
                className={inputClass}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="">Choose compatible settings</option>
                {templates.data
                  ?.filter(
                    (t) =>
                      (!t.configuration.type || t.configuration.type === flow.config?.type) &&
                      t.configuration.columns.some((c) =>
                        flow.inspection?.columns.some((s) => s.source === c.source),
                      ),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className={`${secondaryClass} mt-3`}
              disabled={!template}
              onClick={applyTemplate}
            >
              Apply and review settings
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Reuses compatible column choices. Event details, records, and location matches stay
              separate.
            </p>
          </div>
          <ImportColumnsStep
            config={flow.config}
            inspection={flow.inspection}
            target={selected}
            onChange={change}
          />
          <label className="mt-6 block text-sm font-medium text-slate-600">
            Save these settings for my team{" "}
            <span className="font-normal text-slate-400">(optional name)</span>
            <input
              maxLength={120}
              className={inputClass}
              placeholder="e.g. Outreach registration format"
              value={flow.config.template_name ?? ""}
              onChange={(e) => change({ ...flow.config!, template_name: e.target.value })}
            />
            <span className="mt-2 block text-xs leading-5 text-slate-500">
              Saved only after a successful import. Leave blank to skip.
            </span>
          </label>
        </>
      )}
      {flow.step === 3 && flow.config && (
        <>
          <ImportLocationsStep
            config={flow.config}
            locations={flow.locations}
            fresh={flow.locationFresh}
            fixedLevel={!!selected?.records_count}
            unknown={flow.unknown}
            onUnknown={(unknown) => patch({ unknown })}
            onChange={change}
            onCheck={() => locations()}
            onPage={locations}
          />
          {flow.config.type === "event" && (
            <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input
                className="mt-1.5"
                type="checkbox"
                checked={flow.singleEvent}
                onChange={(e) => patch({ singleEvent: e.target.checked })}
              />
              <span>
                Every attendee belongs to <strong>{flow.config.metadata.name}</strong>. This
                workbook represents one event.
              </span>
            </label>
          )}
        </>
      )}
      {flow.step === 4 && flow.review && flow.config && (
        <ImportReviewStep
          review={flow.review}
          config={flow.config}
          category={flow.category}
          exclusions={flow.exclusions}
          confirmed={flow.singleEvent}
          onExclusions={(exclusions) => patch({ exclusions })}
          onConfirmed={(singleEvent) => patch({ singleEvent })}
          onCategory={(category) => reviewPage(category)}
          onPage={(page) => reviewPage(flow.category, page)}
          onResolve={resolve}
          onDownload={() =>
            void run("Downloading error report…", async () => {
              await downloadDatasetFile(
                `/datasets/import/sessions/${flow.session!.id}/errors`,
                "import-errors.csv",
              );
            })
          }
        />
      )}
      {flow.step === 5 && flow.result && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl bg-team/5 p-5">
            <CheckCircle2 size={36} className="shrink-0 text-team" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-slate-900">Your records are ready</h3>
              <p className="mt-1 text-sm text-slate-500">Import completed for {team}.</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(["new", "updates", "skipped", "rejected", "unknown"] as const).map((key) => (
              <div key={key} className="rounded-xl border border-slate-200 p-4">
                <dd className="text-2xl font-semibold tabular-nums">
                  {flow.result![key].toLocaleString()}
                </dd>
                <dt className="mt-1 text-xs text-slate-500">
                  {
                    {
                      new: "Added",
                      updates: "Updated",
                      skipped: "Unchanged / kept",
                      rejected: "Excluded",
                      unknown: "Location unknown",
                    }[key]
                  }
                </dt>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-6 text-slate-500">
            Unknown locations are included in the accepted-record counts, but do not shade areas on
            the map. A verified location may still lack a usable map boundary. Event venue pins need
            a verified venue location.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={primaryClass} onClick={viewMap}>
              View on map
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link className={secondaryClass} to={`/datasets/${flow.result.dataset_id}/records`}>
              View records
            </Link>
            <button className={secondaryClass} onClick={startOver}>
              Import another file
            </button>
          </div>
        </div>
      )}
    </>
  );
}
