import { useQuery } from "@tanstack/react-query";
import { BarangayShapesUnavailable, createBoundaryLoader } from "../services/mapBoundaries";
import { useAuthStore } from "../stores/useAuthStore";
import { useFilterStore } from "../stores/useFilterStore";
import { usesPoliticalExplorer } from "../lib/teamAccess";

const loadBoundaries = createBoundaryLoader(fetch, `${import.meta.env.BASE_URL}maps/ph-2019/`);

/** Barangay shapes for the selected city (Political explorer only). */
export function useBarangayShapes() {
  const enabled = useAuthStore((s) => usesPoliticalExplorer(s.user));
  const city = useFilterStore((s) => s.activeCityMuni);
  const query = useQuery({
    queryKey: ["barangay-shapes", city],
    queryFn: () => loadBoundaries("barangay", undefined, undefined, city!),
    enabled: enabled && !!city,
    staleTime: Infinity,
    retry: (count, error) => !(error instanceof BarangayShapesUnavailable) && count < 2,
  });
  return { enabled, city, ...query };
}
