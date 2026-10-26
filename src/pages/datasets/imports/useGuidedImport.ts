import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Dataset, WorkbookInspection } from "../../../services/api/datasetApi";
import {
  commitImport,
  createImportSession,
  discardImportSession,
  fetchImportReview,
  fetchImportSession,
  inspectImportFile,
  inspectImportLocations,
  prepareImport,
  resolveImportConflict,
  saveImportSession,
  resumeImportSession,
} from "../../../services/api/importSessionApi";
import type {
  GuidedConfiguration,
  GuidedReview,
  ImportResult,
  ImportSession,
  LocationReview,
} from "../../../services/api/importSessionApi";
import { configurationForFile, essentialProblem, importError } from "../../../lib/guidedImport";
import { assertSession, sessionGeneration } from "../../../lib/session";

interface Flow {
  session: ImportSession | null;
  target: number | null;
  config: GuidedConfiguration | null;
  file: File | null;
  inspection: WorkbookInspection | null;
  step: number;
  review: GuidedReview | null;
  locations: LocationReview | null;
  locationFresh: boolean;
  sheets: boolean;
  unknown: boolean;
  singleEvent: boolean;
  exclusions: boolean;
  category: string;
  result: ImportResult | null;
  error: string;
  saved: string;
}
const initial = (target: number | null): Flow => ({
  session: null,
  target,
  config: null,
  file: null,
  inspection: null,
  step: 0,
  review: null,
  locations: null,
  locationFresh: false,
  sheets: false,
  unknown: false,
  singleEvent: false,
  exclusions: false,
  category: "",
  result: null,
  error: "",
  saved: "",
});

export function useGuidedImport(datasets: Dataset[]) {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get("session");
  const targetFromUrl = Number(params.get("dataset")) || null;
  const [flow, setFlow] = useState(() => initial(targetFromUrl));
  const [busy, setBusy] = useState("");
  const running = useRef(false);
  const loaded = useRef("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const patch = (value: Partial<Flow>) => setFlow((current) => ({ ...current, ...value }));
  const run = useCallback(async (label: string, action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    const generation = sessionGeneration();
    setBusy(label);
    setFlow((current) => ({ ...current, error: "" }));
    try {
      await action();
      assertSession(generation);
    } catch (error) {
      try {
        assertSession(generation);
        setFlow((current) => ({ ...current, error: importError(error) }));
      } catch {
        /* Identity reset owns the new UI. */
      }
    } finally {
      running.current = false;
      setBusy("");
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      loaded.current = "";
      return;
    }
    if (
      !sessionId ||
      running.current ||
      loaded.current === sessionId ||
      flow.session?.id === sessionId
    )
      return;
    loaded.current = sessionId;
    void run("Restoring your import…", async () => {
      const found = await fetchImportSession(sessionId);
      const session = found.state === "committed" ? found : await resumeImportSession(found);
      const review = session.state === "reviewing" ? await fetchImportReview(session.id) : null;
      setFlow({
        ...initial(session.dataset_id),
        session,
        config: session.configuration,
        saved: JSON.stringify(session.configuration),
        review,
        result: session.result,
        step: session.result ? 5 : review ? 4 : 0,
        singleEvent: !!review,
      });
    });
  }, [sessionId, flow.session?.id, run, busy]);

  const change = (config: GuidedConfiguration) =>
    patch({
      config,
      review: null,
      locationFresh: false,
      unknown: false,
      exclusions: false,
      ...(flow.step === 4 ? { step: 2 } : {}),
    });

  async function persist() {
    if (!flow.session || !flow.config) throw new Error("Choose a file first.");
    const session = await saveImportSession(flow.session, flow.config, flow.target);
    patch({ session, saved: JSON.stringify(flow.config) });
    return session;
  }

  useEffect(() => {
    if (
      !flow.session ||
      !flow.config ||
      busy ||
      flow.error ||
      flow.review ||
      flow.result ||
      flow.saved === JSON.stringify(flow.config)
    )
      return;
    const timer = setTimeout(() => {
      void run("Saving draft…", async () => {
        const session = await saveImportSession(flow.session!, flow.config!, flow.target);
        setFlow((current) => ({ ...current, session, saved: JSON.stringify(flow.config) }));
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [
    flow.session,
    flow.config,
    flow.saved,
    flow.target,
    flow.review,
    flow.result,
    flow.error,
    busy,
    run,
  ]);

  function chooseFile(
    file: File,
    replace = false,
    sheet?: string,
    headerRow?: number,
    preset?: GuidedConfiguration,
  ) {
    void run("Reading your spreadsheet…", async () => {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name))
        throw new Error("Choose an Excel (.xlsx or .xls) or CSV file.");
      if (file.size > 10 * 1024 * 1024)
        throw new Error("This file is larger than 10 MB. Choose a smaller spreadsheet.");
      const session = flow.session ?? (await createImportSession(flow.target ?? undefined));
      // Keep the draft addressable even if inspection fails.
      patch({ session });
      loaded.current = session.id;
      setParams(
        { session: session.id, ...(flow.target ? { dataset: String(flow.target) } : {}) },
        { replace: true },
      );
      const result = await inspectImportFile(session, file, { replace, sheet, headerRow });
      const dataset = datasets.find((d) => d.id === flow.target);
      const config = configurationForFile(
        result.inspection,
        file.name,
        dataset,
        preset ?? flow.config,
      );
      if (
        replace ||
        (flow.inspection &&
          (flow.inspection.sheet !== result.inspection.sheet ||
            flow.inspection.header_row !== result.inspection.header_row))
      )
        config.locations = {};
      patch({
        session: result.session,
        config,
        file,
        inspection: result.inspection,
        step: 0,
        sheets: result.inspection.sheets.length === 1,
        review: null,
        locations: null,
        locationFresh: false,
        unknown: false,
        singleEvent: false,
        exclusions: false,
        result: null,
      });
      const saved = await saveImportSession(result.session, config, flow.target);
      patch({
        session: saved,
        config,
        file,
        inspection: result.inspection,
        saved: JSON.stringify(config),
        step: 0,
        sheets: result.inspection.sheets.length === 1,
        review: null,
        locations: null,
        locationFresh: false,
        unknown: false,
        singleEvent: false,
        exclusions: false,
        result: null,
      });
    });
  }

  function target(id: number | null) {
    if (!flow.inspection || !flow.file) return;
    const dataset = datasets.find((d) => d.id === id);
    patch({
      target: id,
      config: configurationForFile(flow.inspection, flow.file.name, dataset),
      saved: "",
      review: null,
      locations: null,
      locationFresh: false,
      unknown: false,
      singleEvent: false,
      exclusions: false,
    });
  }

  function locations(page = 1) {
    void run("Checking location matches…", async () => {
      if (!flow.file || !flow.inspection)
        throw new Error("Reselect your file before checking locations.");
      const session = await persist();
      const result = await inspectImportLocations(session, flow.file, flow.inspection.sheets, page);
      patch({ locations: result, locationFresh: true, review: null });
    });
  }

  function next() {
    void run(flow.step === 3 ? "Preparing your review…" : "Saving your progress…", async () => {
      if (!flow.config || !flow.file || !flow.inspection)
        throw new Error("Choose or reselect your spreadsheet first.");
      if (!flow.sheets) throw new Error("Review the populated worksheets before continuing.");
      if (
        flow.step === 1 &&
        (flow.config.type === "event"
          ? !(flow.config.metadata.name ?? "").trim() || !flow.config.metadata.date
          : !flow.config.name?.trim())
      )
        throw new Error("Complete the required name and event date before continuing.");
      if (flow.step === 2 && essentialProblem(flow.config))
        throw new Error(essentialProblem(flow.config));
      if (flow.step === 3 && (!flow.locations || !flow.locationFresh))
        throw new Error("Check location matches before preparing your review.");
      if (flow.step === 3 && flow.config.type === "event" && !flow.singleEvent)
        throw new Error("Confirm that all attendees belong to this event.");
      const session = await persist();
      if (flow.step === 3) {
        const review = await prepareImport(
          session,
          flow.file,
          flow.inspection.sheets,
          flow.unknown,
          flow.singleEvent,
        );
        patch({ session: review.session, review, step: 4, exclusions: false, category: "" });
      } else patch({ step: flow.step + 1 });
    });
  }

  function reviewPage(category = flow.category, page = 1) {
    void run("Loading review…", async () => {
      if (!flow.session) return;
      const review = await fetchImportReview(flow.session.id, category, page);
      patch({ review, session: review.session, category });
    });
  }

  function resolve(row: number, resolution: "keep_existing" | "take_new") {
    void run("Saving your decision…", async () => {
      if (!flow.session) return;
      const review = await resolveImportConflict(flow.session, row, resolution);
      patch({ review, session: review.session, category: "" });
    });
  }

  function commit() {
    void run("Importing records…", async () => {
      if (!flow.session) return;
      let result: ImportResult;
      try {
        result = await commitImport(flow.session, flow.exclusions);
      } catch (error) {
        const latest = await fetchImportSession(flow.session.id);
        if (latest.state === "committed" && latest.result) result = latest.result;
        else throw error;
      }
      patch({ result, step: 5, review: null });
      await qc.invalidateQueries();
    });
  }

  function startOver() {
    patch(initial(null));
    // Router navigation may finish after the local reset. Do not restore the old URL's session.
    loaded.current = sessionId ?? "";
    setParams({}, { replace: true });
    void qc.invalidateQueries({ queryKey: ["import-sessions"] });
  }

  function discard() {
    void run("Discarding draft…", async () => {
      if (flow.session) await discardImportSession(flow.session);
      startOver();
    });
  }

  function leave() {
    void run("Saving before leaving…", async () => {
      if (flow.config && flow.session && !flow.review && !flow.result) await persist();
      navigate("/datasets");
    });
  }

  function back() {
    // A server review remains resumable until the user explicitly changes setup.
    patch({
      step: !flow.file ? 0 : Math.max(0, flow.step - 1),
      ...(flow.step === 4 ? { review: null } : {}),
    });
  }

  return {
    flow,
    busy,
    patch,
    change,
    run,
    chooseFile,
    target,
    locations,
    next,
    reviewPage,
    resolve,
    commit,
    discard,
    startOver,
    back,
    leave,
  };
}
