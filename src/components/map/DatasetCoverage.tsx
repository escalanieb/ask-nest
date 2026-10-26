import type { LayerResponse } from "../../services/api/datasetApi";
import { datasetBoundaryCoverage } from "../../lib/datasetLayer";

export default function DatasetCoverage({
  data,
  level,
  boundaries,
  loading,
  error,
}: {
  data: LayerResponse;
  level: "region" | "province" | "municity";
  boundaries: ReadonlySet<string>;
  loading: boolean;
  error: boolean;
}) {
  if (!data.summary) return null;
  const coverage = datasetBoundaryCoverage(data, level, boundaries);
  return (
    <p className="mb-2 max-w-64 text-[10px] leading-5 text-slate-600">
      {data.summary.total} filtered / {data.summary.unfiltered_total} imported
      <br />
      {data.summary.unknown ?? data.summary.unmapped} location unknown · {data.summary.areas} areas
      <br />
      {error ? (
        "Boundary coverage unavailable. Retry loading boundaries."
      ) : loading ? (
        "Checking boundary coverage…"
      ) : (
        <>
          {coverage.withBoundary} records match loaded boundaries
          <br />
          {coverage.withoutBoundary} have a code but no loaded boundary
        </>
      )}
    </p>
  );
}
