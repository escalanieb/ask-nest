import { useQuery } from "@tanstack/react-query";
import { psgcApi } from "../../services/api/psgcApi";
import { areaLevels, selectArea, type PoliticalArea } from "../../lib/politicalArea";
import type { AreaLevel } from "../../lib/exploreSummary";

const labels: Record<AreaLevel, string> = {
  region: "Region",
  province: "Province",
  city: "City or municipality",
  barangay: "Barangay",
};
const emptyLabels: Record<AreaLevel, string> = {
  region: "All regions",
  province: "All provinces",
  city: "All cities",
  barangay: "All barangays",
};
const STALE_TIME = 10 * 60 * 1000;

export interface AreaDropdownsProps {
  area: PoliticalArea;
  onChange: (area: PoliticalArea, level: AreaLevel) => void;
  maxLevel?: AreaLevel;
  mode: "filter" | "record";
}

export default function AreaDropdowns({
  area,
  onChange,
  maxLevel = "barangay",
  mode,
}: AreaDropdownsProps) {
  const regions = useQuery({
    queryKey: ["psgc-regions"],
    queryFn: psgcApi.regions,
    staleTime: STALE_TIME,
  });
  const provinces = useQuery({
    queryKey: ["psgc-provinces", area.region],
    queryFn: () => psgcApi.regionProvinces(area.region!),
    enabled: !!area.region,
    staleTime: STALE_TIME,
  });
  const cities = useQuery({
    queryKey: ["psgc-cities-munis", area.region],
    queryFn: () => psgcApi.regionCitiesMunicipalities(area.region!),
    enabled: !!area.region && maxLevel !== "province",
    staleTime: STALE_TIME,
  });
  const barangays = useQuery({
    queryKey: ["psgc-barangays", area.city],
    queryFn: () => psgcApi.barangaysByCityMunicipality(area.city!),
    enabled: !!area.city && maxLevel === "barangay",
    staleTime: STALE_TIME,
  });

  const queries = { region: regions, province: provinces, city: cities, barangay: barangays };
  const levels = areaLevels.slice(0, areaLevels.indexOf(maxLevel) + 1);

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {levels.map((level) => {
        const query = queries[level];
        const options =
          level === "city" && area.province
            ? (cities.data ?? []).filter(
                (city) =>
                  city.provinceCode === area.province ||
                  city.code.slice(0, 4) === area.province?.slice(0, 4),
              )
            : (query.data ?? []);
        const hasParent =
          level === "region" || (level === "barangay" ? !!area.city : !!area.region);
        return (
          <div key={level} className="min-w-0">
            <label className="block text-xs font-medium text-slate-700">
              {labels[level]}
              <select
                value={area[level] ?? ""}
                disabled={!hasParent || query.isLoading || !options.length}
                onChange={(event) =>
                  onChange(selectArea(area, level, event.target.value || null), level)
                }
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">
                  {query.isLoading
                    ? "Loading…"
                    : mode === "filter"
                      ? emptyLabels[level]
                      : "Choose or leave blank"}
                </option>
                {options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            {hasParent && query.isError && (
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="mt-1 text-xs text-team underline"
              >
                Retry {labels[level].toLowerCase()}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
