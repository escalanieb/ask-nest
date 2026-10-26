import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, CheckCircle2, Search } from "lucide-react";
import { findImportLocations } from "../../../services/api/datasetApi";
import type {
  GuidedConfiguration,
  LocationGroup,
  LocationReview,
} from "../../../services/api/importSessionApi";
import { importError } from "../../../lib/guidedImport";
import { inputClass, secondaryClass } from "./ImportFileStep";

function LocationChoice({
  group,
  config,
  onMatch,
}: {
  group: LocationGroup;
  config: GuidedConfiguration;
  onMatch: (value: string | null) => void;
}) {
  const [search, setSearch] = useState(() => Object.values(group.raw).join(" "));
  const [submitted, setSubmitted] = useState<string | null>(null);
  const lookup = useQuery({
    queryKey: ["import-location-search", config.psgc_level, submitted],
    queryFn: () => findImportLocations(config.psgc_level, submitted!),
    enabled: submitted !== null,
  });
  const decision = Object.hasOwn(config.locations, group.key)
    ? config.locations[group.key]
    : group.code;
  const options = Array.from(
    new Map([...group.candidates, ...(lookup.data?.data ?? [])].map((p) => [p.code, p])).values(),
  );
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-800">
            {Object.values(group.raw).filter(Boolean).join(" · ") || "No location supplied"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {group.count.toLocaleString()} {group.count === 1 ? "record" : "records"} ·{" "}
            {group.status === "verified"
              ? "Verified match"
              : group.status === "ambiguous"
                ? "More than one possible match"
                : "Needs review"}
          </p>
        </div>
        {decision && (
          <CheckCircle2 className="shrink-0 text-team" size={18} aria-label="Verified location" />
        )}
      </div>
      <label className="mt-3 block text-xs text-slate-600">
        Use this location
        <select
          aria-label={`Location for ${Object.values(group.raw).join(" ") || "blank"}`}
          className={inputClass}
          value={decision ?? ""}
          onChange={(e) => onMatch(e.target.value || null)}
        >
          <option value="">Keep location unknown</option>
          {decision && !options.some((p) => p.code === decision) && (
            <option value={decision}>Verified code {decision}</option>
          )}
          {options.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} · {p.code}
            </option>
          ))}
        </select>
      </label>
      {!group.code && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-team">
            Find a different location
          </summary>
          <div className="mt-3 flex gap-2">
            <input
              aria-label={`Search location for ${group.key}`}
              className={`${inputClass} !mt-0`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Place name or geographic code"
            />
            <button
              type="button"
              aria-label="Search locations"
              className={secondaryClass}
              disabled={lookup.isFetching || !search.trim()}
              onClick={() => {
                if (submitted === search) void lookup.refetch();
                else setSubmitted(search);
              }}
            >
              <Search size={16} aria-hidden="true" />
            </button>
          </div>
          {lookup.data && (
            <p className="mt-2 text-xs text-slate-500">
              {lookup.data.total} matches; up to 50 shown in the location dropdown. Refine your
              search if needed.
            </p>
          )}
          {lookup.isError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {importError(lookup.error)}
            </p>
          )}
        </details>
      )}
    </div>
  );
}

export default function ImportLocationsStep({
  config,
  locations,
  fresh,
  fixedLevel,
  unknown,
  onUnknown,
  onChange,
  onCheck,
  onPage,
}: {
  config: GuidedConfiguration;
  locations: LocationReview | null;
  fresh: boolean;
  fixedLevel: boolean;
  unknown: boolean;
  onUnknown: (value: boolean) => void;
  onChange: (config: GuidedConfiguration) => void;
  onCheck: () => void;
  onPage: (page: number) => void;
}) {
  const separate = !config.location_source.single && Object.keys(config.location_source).length > 0;
  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
        <MapPin className="mt-0.5 shrink-0 text-team" size={20} aria-hidden="true" />
        <p className="text-sm leading-6 text-slate-600">
          {config.type === "event"
            ? "Match attendees’ home locations, not the event venue."
            : "Match the locations represented by your records."}{" "}
          Unknown locations stay in your records and totals, but will not shade an area on the map.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Geographic detail
          <select
            className={inputClass}
            disabled={fixedLevel}
            value={config.psgc_level}
            onChange={(e) =>
              onChange({
                ...config,
                psgc_level: e.target.value as GuidedConfiguration["psgc_level"],
                locations: {},
              })
            }
          >
            <option value="province">Province</option>
            <option value="city">City / municipality</option>
            <option value="barangay">Barangay</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          How is the location written?
          <select
            className={inputClass}
            value={separate ? "separate" : "single"}
            onChange={(e) =>
              onChange({
                ...config,
                location_source:
                  e.target.value === "separate" ? { province: "", city: "", barangay: "" } : {},
                locations: {},
              })
            }
          >
            <option value="single">One location or PSGC-code column</option>
            <option value="separate">Separate address columns</option>
          </select>
        </label>
      </div>
      <div className={`grid gap-4 ${separate ? "sm:grid-cols-3" : ""}`}>
        {(separate ? (["province", "city", "barangay"] as const) : (["single"] as const)).map(
          (role) => (
            <label key={role} className="text-sm font-medium text-slate-700">
              {role === "single"
                ? "Location column"
                : role === "city"
                  ? "City / municipality column"
                  : `${role[0].toUpperCase()}${role.slice(1)} column`}
              <select
                className={inputClass}
                value={config.location_source[role] ?? ""}
                onChange={(e) =>
                  onChange({
                    ...config,
                    location_source: { ...config.location_source, [role]: e.target.value },
                    locations: {},
                  })
                }
              >
                <option value="">Not supplied</option>
                {config.columns.map((c) => (
                  <option key={c.source}>{c.source}</option>
                ))}
              </select>
            </label>
          ),
        )}
      </div>
      <button type="button" className={secondaryClass} onClick={onCheck}>
        Check location matches
      </button>
      {!fresh && locations && (
        <p className="text-sm text-amber-800">
          Location choices changed. Check matches again to refresh the counts before continuing.
        </p>
      )}
      {locations && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-600">
              {locations.total.toLocaleString()} different locations
            </span>
            <span className="rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-800">
              {locations.unknown_rows.toLocaleString()}{" "}
              {locations.unknown_rows === 1 ? "record" : "records"} with unknown locations
            </span>
          </div>
          <div className="space-y-3">
            {locations.data.map((group) => (
              <LocationChoice
                key={group.key}
                group={group}
                config={config}
                onMatch={(value) =>
                  onChange({ ...config, locations: { ...config.locations, [group.key]: value } })
                }
              />
            ))}
          </div>
          {locations.last_page > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className={secondaryClass}
                disabled={locations.page <= 1}
                onClick={() => onPage(locations.page - 1)}
              >
                Previous locations
              </button>
              <span>
                {locations.page} / {locations.last_page}
              </span>
              <button
                type="button"
                className={secondaryClass}
                disabled={locations.page >= locations.last_page}
                onClick={() => onPage(locations.page + 1)}
              >
                Next locations
              </button>
            </div>
          )}
          {locations.unknown_rows > 0 && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <input
                className="mt-1.5"
                type="checkbox"
                checked={unknown}
                onChange={(e) => onUnknown(e.target.checked)}
              />
              <span>
                Keep {locations.unknown_rows.toLocaleString()}{" "}
                {locations.unknown_rows === 1 ? "record" : "records"} with{" "}
                <strong>Location unknown</strong>. Include them in records and applicable totals;
                exclude them from geographic shading.
              </span>
            </label>
          )}
        </>
      )}
    </div>
  );
}
