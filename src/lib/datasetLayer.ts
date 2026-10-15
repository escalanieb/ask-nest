import type { LayerDataPoint, LayerResponse } from "../services/api/datasetApi";

/** Aggregate the dataset's geography to the boundaries currently shown on the map. */
export function buildDatasetLayer(
  response: LayerResponse,
  level: "region" | "province" | "municity",
): Map<string, LayerDataPoint> {
  const groups = new Map<string, LayerDataPoint[]>();
  for (const point of response.layer_data) {
    const length = level === "region" ? 2 : level === "province" ? 4 : 6;
    const code = point.psgc_code.slice(0, length).padEnd(9, "0");
    const group = groups.get(code) ?? [];
    group.push(point);
    groups.set(code, group);
  }
  const result = new Map<string, LayerDataPoint>();
  const operation = response.dataset.layer_config.aggregate_function;
  for (const [code, points] of groups) {
    const count = points.reduce((sum, point) => sum + point.count, 0);
    const values = points.map((point) => point.display_value);
    const display =
      operation === "max"
        ? Math.max(...values)
        : operation === "average"
          ? count
            ? points.reduce((sum, point) => sum + point.display_value * point.count, 0) / count
            : 0
          : values.reduce((sum, value) => sum + value, 0);
    result.set(code, {
      ...points[0],
      psgc_code: code,
      count,
      display_value: display,
      tooltip: { Total: count },
    });
  }
  return result;
}

/** Keep area popups consistent with the latest filtered layer, including grouped breakdowns. */
export function summarizeDatasetArea(points: readonly LayerDataPoint[], prefix: string) {
  let count = 0;
  const tooltip: Record<string, Record<string, number>> = {};
  for (const point of points) {
    if (!point.psgc_code.startsWith(prefix)) continue;
    count += point.count;
    for (const [field, values] of Object.entries(point.tooltip)) {
      if (field === "Total" || !values || typeof values !== "object") continue;
      tooltip[field] ??= {};
      for (const [value, total] of Object.entries(values)) {
        if (typeof total === "number") tooltip[field][value] = (tooltip[field][value] ?? 0) + total;
      }
    }
  }
  return { count, tooltip };
}
