import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { psgcApi } from "../../services/api/psgcApi";
import type { PsgcBarangay, PsgcCityMunicipality } from "../../services/api/psgcApi";
import { useFilterStore } from "../../stores/useFilterStore";
import { useMapStore } from "../../stores/useMapStore";
import { clearArea } from "../../hooks/useExplore";

interface Option {
  code: string;
  name: string;
}

/**
 * One box for "where": a breadcrumb plus a searchable list of the next level
 * down (Region, then Province, then City). Clicking the map also fills it.
 */
export default function AreaPicker({ withBarangay = false }: { withBarangay?: boolean }) {
  const { activeRegion, activeProvince, activeCityMuni, activeBarangay } = useFilterStore();
  const setActiveBarangay = useFilterStore((s) => s.setActiveBarangay);
  const setActiveRegion = useFilterStore((s) => s.setActiveRegion);
  const setActiveProvince = useFilterStore((s) => s.setActiveProvince);
  const setActiveCityMuni = useFilterStore((s) => s.setActiveCityMuni);
  const setSelectedLocation = useMapStore((s) => s.setSelectedLocation);
  const mapAreaLevel = useMapStore((s) => s.mapAreaLevel);
  const [search, setSearch] = useState("");

  const regions = useQuery({
    queryKey: ["psgc-regions"],
    queryFn: psgcApi.regions,
    staleTime: 1000 * 60 * 10,
  });
  const provinces = useQuery({
    queryKey: ["psgc-provinces", activeRegion],
    queryFn: () => psgcApi.regionProvinces(activeRegion!),
    enabled: !!activeRegion,
    staleTime: 1000 * 60 * 10,
  });
  const cities = useQuery({
    queryKey: ["psgc-cities-munis", activeRegion],
    queryFn: () => psgcApi.regionCitiesMunicipalities(activeRegion!),
    enabled: !!activeRegion,
    staleTime: 1000 * 60 * 10,
  });

  const barangays = useQuery({
    queryKey: ["psgc-barangays", activeCityMuni],
    queryFn: () => psgcApi.barangaysByCityMunicipality(activeCityMuni!),
    enabled: withBarangay && !!activeCityMuni,
    staleTime: 1000 * 60 * 10,
  });

  const provinceList = (provinces.data ?? []) as Option[];
  const cityList = (cities.data ?? []) as PsgcCityMunicipality[];
  const barangayList = (barangays.data ?? []) as PsgcBarangay[];
  const regionName = regions.data?.find((r) => r.code === activeRegion)?.name;
  const provinceName = provinceList.find((p) => p.code === activeProvince)?.name;
  const cityName = cityList.find((c) => c.code === activeCityMuni)?.name;
  const barangayName = barangayList.find((b) => b.code === activeBarangay)?.name;

  let step: "region" | "province" | "city" | "barangay" | "done" = "region";
  let options: Option[] = (regions.data ?? []) as Option[];
  let loading = regions.isLoading;
  if (activeRegion) {
    if (activeCityMuni) {
      if (withBarangay && !activeBarangay) {
        step = "barangay";
        options = barangayList;
        loading = barangays.isLoading;
      } else {
        step = "done";
        options = [];
      }
    } else if (activeProvince || (!provinces.isLoading && provinceList.length === 0)) {
      step = "city";
      options = cityList.filter((c) => !activeProvince || c.provinceCode === activeProvince);
      loading = cities.isLoading;
    } else {
      step = "province";
      options = provinceList;
      loading = provinces.isLoading;
    }
  }

  const visible = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  function choose(option: Option) {
    setSearch("");
    if (step === "region") {
      setActiveRegion(option.code);
      setSelectedLocation(
        mapAreaLevel === "region"
          ? { psgcCode: option.code, name: option.name, type: "Region", lat: 0, lng: 0 }
          : null,
      );
    } else if (step === "province") {
      setActiveProvince(option.code);
    } else if (step === "city") {
      setActiveCityMuni(option.code);
    } else if (step === "barangay") {
      setActiveBarangay(option.code);
    }
  }

  const crumb = "text-xs font-semibold text-team hover:underline";
  const nouns = {
    region: "region",
    province: "province",
    city: "city or municipality",
    barangay: "barangay",
    done: "",
  };

  return (
    <div className="space-y-2">
      <nav aria-label="Selected area" className="flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          className={activeRegion ? crumb : "font-semibold text-slate-700"}
          onClick={clearArea}
        >
          Philippines
        </button>
        {activeRegion && (
          <>
            <span aria-hidden="true">›</span>
            <button type="button" className={crumb} onClick={() => setActiveProvince(null)}>
              {regionName ?? "Region"}
            </button>
          </>
        )}
        {activeProvince && (
          <>
            <span aria-hidden="true">›</span>
            <button type="button" className={crumb} onClick={() => setActiveCityMuni(null)}>
              {provinceName ?? "Province"}
            </button>
          </>
        )}
        {activeCityMuni && (
          <>
            <span aria-hidden="true">›</span>
            {activeBarangay ? (
              <button type="button" className={crumb} onClick={() => setActiveBarangay(null)}>
                {cityName ?? "City"}
              </button>
            ) : (
              <span className="font-semibold text-slate-700">{cityName ?? "City"}</span>
            )}
          </>
        )}
        {activeBarangay && (
          <>
            <span aria-hidden="true">›</span>
            <span className="font-semibold text-slate-700">{barangayName ?? "Barangay"}</span>
          </>
        )}
      </nav>

      {step === "done" ? (
        <p className="text-xs text-slate-500">
          Showing this {activeBarangay ? "barangay" : "city"} only. Use the path above to go back.
        </p>
      ) : (
        <>
          <label className="block text-xs text-slate-600">
            {activeRegion ? `Narrow to a ${nouns[step]} (optional)` : "Choose a region"}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Type to search ${step === "city" ? "cities or municipalities" : `${nouns[step]}s`}…`}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-team"
            />
          </label>
          <ul className="max-h-40 overflow-y-auto rounded border border-slate-200">
            {loading && <li className="p-2 text-xs text-slate-400">Loading…</li>}
            {!loading && visible.length === 0 && (
              <li className="p-2 text-xs text-slate-400">Nothing matches “{search}”.</li>
            )}
            {visible.map((o) => (
              <li key={o.code}>
                <button
                  type="button"
                  onClick={() => choose(o)}
                  className="w-full px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-team-soft"
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
