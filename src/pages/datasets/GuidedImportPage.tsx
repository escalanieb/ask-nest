import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  HelpCircle,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { fetchBatches, fetchDatasets } from "../../services/api/datasetApi";
import { fetchImportSessions } from "../../services/api/importSessionApi";
import { importSteps, essentialProblem } from "../../lib/guidedImport";
import { useAuthStore } from "../../stores/useAuthStore";
import { useMapSourceStore } from "../../stores/useMapSourceStore";
import { useDatasetLayerStore } from "../../stores/useDatasetLayerStore";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore } from "../../stores/useMapStore";
import { useGuidedImport } from "./imports/useGuidedImport";
import { primaryClass, secondaryClass } from "./imports/ImportFileStep";
import ImportLayout from "./imports/ImportLayout";
import ImportStepContent from "./imports/ImportStepContent";

export default function GuidedImportPage() {
  const user = useAuthStore((s) => s.user);
  // Reset local files and samples when any access boundary changes.
  return (
    <GuidedImportWorkspace
      key={`${user?.id}:${user?.team?.id}:${user?.role}:${user?.capabilities?.slice().sort().join(",")}`}
    />
  );
}

function GuidedImportWorkspace() {
  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => fetchDatasets() });
  const drafts = useQuery({ queryKey: ["import-sessions"], queryFn: fetchImportSessions });
  const controller = useGuidedImport(datasets.data ?? []);
  const { flow, busy, patch, next, commit, discard, startOver, back, leave } = controller;
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const team = useAuthStore((s) => s.user?.team?.name);
  const [discardAsked, setDiscardAsked] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const batches = useQuery({
    queryKey: ["batches", flow.target],
    queryFn: () => fetchBatches(flow.target!),
    enabled: !!flow.target,
  });
  const pending = batches.data?.data.find((b) => b.status === "pending");
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [flow.step]);
  const name = flow.config?.type === "event" ? flow.config.metadata.name : flow.config?.name;
  const expiry = flow.session
    ? new Date(flow.session.expires_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const stepHelp = [
    "Choose your file and check a few rows before continuing.",
    "Tell us what these records represent. Suggested details are yours to review.",
    "Start with the columns we need. Everything else can stay simple.",
    "Keep your records, even when some locations cannot be mapped.",
    "See exactly what will change before anything is published.",
    "Your import has completed. Here is what changed.",
  ][flow.step];
  const canContinue =
    !busy &&
    !pending &&
    !!flow.file &&
    !!flow.inspection &&
    (flow.step !== 0 || flow.sheets) &&
    (flow.step !== 2 || (!!flow.config && !essentialProblem(flow.config))) &&
    (flow.step !== 3 ||
      (flow.locationFresh &&
        !!flow.locations &&
        (!flow.locations.unknown_rows || flow.unknown) &&
        (flow.config?.type !== "event" || flow.singleEvent)));
  const canCommit =
    !busy &&
    !!flow.review &&
    flow.review.pending_conflicts === 0 &&
    (!flow.review.stats.rejected || flow.exclusions) &&
    (flow.config?.type !== "event" || flow.singleEvent) &&
    flow.review.stats.new +
      flow.review.stats.updates +
      flow.review.stats.conflicts +
      flow.review.stats.skipped >
      0;

  function viewMap() {
    if (!flow.result) return;
    useMapSourceStore.getState().setSource("imported");
    useDatasetLayerStore.getState().setDatasetFilters(flow.result.dataset_id, {});
    useDatasetLayerStore.getState().setActiveLayer(flow.result.dataset_id, flow.config?.psgc_level);
    useDatasetLayerStore.getState().setChoroplethSelection(null);
    useFilterStore.getState().resetFilters();
    useMapStore.getState().setMapAreaLevel("region");
    useMapStore.getState().setShowChoropleth(true);
    navigate("/");
  }

  return (
    <ImportLayout
      step={flow.step}
      team={team}
      expiry={expiry}
      hasSession={!!flow.session}
      completed={!!flow.result}
      busy={busy}
      onLeave={leave}
    >
      {!flow.session && drafts.data && drafts.data.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Continue an unfinished import</h2>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {drafts.data.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2"
              >
                <span className="min-w-0 truncate text-xs text-slate-600">
                  {draft.original_filename ?? "Untitled import"} ·{" "}
                  {draft.state === "reviewing" ? "Ready for review" : "Setup draft"}
                </span>
                <button
                  disabled={!!busy}
                  className="shrink-0 text-xs font-semibold text-team"
                  onClick={() => setParams({ session: draft.id }, { replace: true })}
                >
                  Resume import
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {datasets.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Could not load your datasets.{" "}
          <button className="underline" onClick={() => datasets.refetch()}>
            Retry
          </button>
        </p>
      )}
      {flow.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          <p>{flow.error}</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <button className="font-semibold underline" onClick={() => patch({ error: "" })}>
              Dismiss
            </button>
            {flow.session && (
              <button
                className="font-semibold underline"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload saved draft
              </button>
            )}
            <button className="font-semibold underline" onClick={startOver}>
              Start a new import
            </button>
          </div>
        </div>
      )}
      {pending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This dataset has an earlier pending upload.{" "}
          <Link
            className="font-semibold underline"
            to={`/datasets/${flow.target}/upload?history=1`}
          >
            Resume or discard it
          </Link>{" "}
          before continuing.
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6 lg:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-team">
            Step {flow.step + 1} of {importSteps.length}
          </p>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 outline-none"
          >
            {importSteps[flow.step]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{stepHelp}</p>
          {flow.session?.original_filename && flow.step > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet size={14} aria-hidden="true" />
              <span className="break-all">{flow.session.original_filename}</span>
              {name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{name}</span>
                </>
              )}
            </div>
          )}
        </div>
        <fieldset
          disabled={!!busy || datasets.isLoading}
          className="min-w-0 p-6 disabled:opacity-70 lg:p-7"
        >
          <legend className="sr-only">{importSteps[flow.step]}</legend>
          <ImportStepContent
            controller={controller}
            datasets={datasets.data ?? []}
            team={team}
            viewMap={viewMap}
          />
        </fieldset>
        {flow.step < 5 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 lg:px-7">
            <button
              type="button"
              className={secondaryClass}
              disabled={!!busy || flow.step === 0}
              onClick={back}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </button>
            <span
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 text-xs text-slate-500"
            >
              {busy ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  {busy}
                </>
              ) : flow.session ? (
                <>
                  <ShieldCheck size={14} aria-hidden="true" />
                  {flow.saved === JSON.stringify(flow.config)
                    ? "Draft saved"
                    : "Saving your choices shortly"}
                </>
              ) : (
                "Nothing is imported yet"
              )}
            </span>
            {flow.step === 4 ? (
              <button className={primaryClass} disabled={!canCommit} onClick={commit}>
                Import records
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <button className={primaryClass} disabled={!canContinue} onClick={next}>
                {flow.step === 3 ? "Review changes" : "Continue"}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </footer>
        )}
      </div>
      {flow.step === 4 && !canCommit && !busy && (
        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <HelpCircle className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
          Resolve pending conflicts, acknowledge exclusions, and confirm the event before importing.
          A file with no valid records cannot be imported.
        </p>
      )}
      {flow.session && !flow.result && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <button disabled={!!busy} onClick={leave} className="hover:text-slate-800">
            Leave and finish later
          </button>
          {flow.target && (
            <Link className="hover:text-slate-800" to={`/datasets/${flow.target}/upload?history=1`}>
              View previous imports
            </Link>
          )}
          <button
            disabled={!!busy}
            className="text-slate-500 underline"
            onClick={() => setDiscardAsked(!discardAsked)}
          >
            Discard draft
          </button>
        </div>
      )}
      {discardAsked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Discard this setup and review? Your dataset and records will stay as they are.</p>
          <div className="mt-3 flex gap-3">
            <button
              className={secondaryClass}
              disabled={!!busy}
              onClick={() => {
                discard();
                setDiscardAsked(false);
              }}
            >
              Discard this draft
            </button>
            <button className={secondaryClass} onClick={() => setDiscardAsked(false)}>
              Keep working
            </button>
          </div>
        </div>
      )}
    </ImportLayout>
  );
}
