import type { DataTypeOption } from "../services/api/datasetApi.ts";

/** The list with the most records in the area; the first one wins a tie. */
export function defaultDatasetFor(option: DataTypeOption): number {
  return option.datasets.reduce((best, d) => (d.record_count > best.record_count ? d : best)).id;
}

/** The data type that contains this dataset, or undefined when it is not available in the area. */
export function optionForDataset(
  options: DataTypeOption[],
  datasetId: number | null,
): DataTypeOption | undefined {
  if (datasetId === null) return undefined;
  return options.find((o) => o.datasets.some((d) => d.id === datasetId));
}

/** True when the current selection must be cleared because the area no longer has that data. */
export function selectionIsStale(options: DataTypeOption[], datasetId: number | null): boolean {
  return datasetId !== null && !optionForDataset(options, datasetId);
}

/** "SK Chairpersons (17)" */
export function optionLabel(option: DataTypeOption): string {
  return `${option.label} (${option.record_count.toLocaleString()})`;
}
