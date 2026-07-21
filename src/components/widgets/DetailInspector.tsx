import { useQuery } from "@tanstack/react-query";
import { fetchLocationData } from "../../services/api/mapApi";
import { useMapStore } from "../../stores/useMapStore";
import { useFilterStore } from "../../stores/useFilterStore";

const STATUS_COLOR: Record<string, string> = {
  Active: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Inactive: "text-slate-500 bg-slate-100 border-slate-200",
  Pending: "text-amber-700 bg-amber-50 border-amber-200",
};

export default function DetailInspector() {
  const selectedLocation = useMapStore((s) => s.selectedLocation);
  const activeStatus = useFilterStore((s) => s.activeStatus);
  const activeCityMuni = useFilterStore((s) => s.activeCityMuni);
  const searchQuery = useFilterStore((s) => s.searchQuery);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["location-data", selectedLocation?.psgcCode],
    queryFn: () => fetchLocationData(selectedLocation!.psgcCode),
    enabled: !!selectedLocation,
    staleTime: 1000 * 30,
  });

  const filteredRecords = (data?.records ?? []).filter((r) => {
    const matchesStatus = activeStatus ? r.status === activeStatus : true;
    const matchesCityMuni = activeCityMuni ? r.city_muni_code === activeCityMuni : true;
    const matchesSearch = searchQuery
      ? r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStatus && matchesCityMuni && matchesSearch;
  });

  if (!selectedLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">No region selected</p>
          <p className="text-xs text-slate-400 mt-1">
            Click a region on the map to inspect its data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Location header */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 leading-tight truncate">
              {selectedLocation.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">PSGC {selectedLocation.psgcCode}</p>
          </div>
          <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
            {selectedLocation.type}
          </span>
        </div>

        {/* Stats */}
        {data && (
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Total Records
              </p>
              <p className="text-xl font-bold text-red-600 leading-tight">{data.total_records}</p>
            </div>
            <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Showing
              </p>
              <p className="text-xl font-bold text-slate-700 leading-tight">
                {filteredRecords.length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center flex-1 gap-2 text-slate-400 text-sm">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading records…
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 px-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-xs text-red-500">{(error as Error).message}</p>
        </div>
      )}

      {/* Records table */}
      {data && (
        <div className="flex-1 overflow-y-auto">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
              <svg
                className="h-8 w-8 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-sm text-slate-500">No records match the current filters</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.category}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_COLOR[r.status] ?? "text-slate-500 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
