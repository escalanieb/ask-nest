export type MapSource = "imported" | "tipas" | "none";
export function permittedMapSource(
  source: MapSource,
  capabilities: readonly string[] = [],
): MapSource {
  if (source === "tipas" && capabilities.includes("tipas.use")) return source;
  if (source === "imported" && capabilities.includes("datasets.use")) return source;
  return capabilities.includes("datasets.use")
    ? "imported"
    : capabilities.includes("tipas.use")
      ? "tipas"
      : "none";
}
