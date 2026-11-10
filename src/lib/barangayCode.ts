/** Nine-digit barangay code (no "PH" prefix), the same form the dropdown and records use. */
export function barangayCode(feature: { properties?: Record<string, unknown> | null }): string {
  return String(feature.properties?.ADM4_PCODE ?? "").slice(2);
}
