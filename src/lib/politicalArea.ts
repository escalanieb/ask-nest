import type { AreaLevel } from "./exploreSummary.ts";
import type { PsgcLevel } from "../services/api/datasetApi.ts";

export const areaLevels = ["region", "province", "city", "barangay"] as const;
export const emptyArea = { region: null, province: null, city: null, barangay: null };
export type PoliticalArea = Record<AreaLevel, string | null>;

export function selectArea(
  area: PoliticalArea,
  level: AreaLevel,
  code: string | null,
): PoliticalArea {
  const next = { ...area, [level]: code };
  for (const child of areaLevels.slice(areaLevels.indexOf(level) + 1)) next[child] = null;
  return next;
}

export function selectedLocationCode(
  area: PoliticalArea,
  requiredLevel: PsgcLevel | null,
): string | null {
  return requiredLevel
    ? area[requiredLevel]
    : area.barangay || area.city || area.province || area.region;
}
