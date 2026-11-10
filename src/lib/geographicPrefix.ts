/** PSGC prefix for the deepest selected area (barangay > city > province > region). */
export function geographicPrefix(state: {
  activeCityMuni: string | null;
  activeProvince: string | null;
  activeRegion: string | null;
  activeBarangay?: string | null;
}): string | undefined {
  return (
    state.activeBarangay ||
    state.activeCityMuni?.slice(0, 6) ||
    state.activeProvince?.slice(0, 4) ||
    state.activeRegion?.slice(0, 2) ||
    undefined
  );
}
