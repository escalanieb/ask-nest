export function capabilityForPath(path: string): string | null {
  const routes = [
    ["/datasets", "datasets.use"],
    ["/batches", "datasets.use"],
    ["/analytics", "analytics.use"],
    ["/rss", "rss.use"],
    ["/ai/asc", "ai.use"],
    ["/tipas", "tipas.use"],
  ];
  return (
    routes.find(
      ([prefix]) =>
        path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?"),
    )?.[1] ?? null
  );
}

export const POLITICAL_SLUG = "political";

/** Only the Political team (with dataset access) gets the area-first explorer sidebar. */
export function usesPoliticalExplorer(
  user: { team?: { slug?: string }; capabilities?: readonly string[] } | null | undefined,
): boolean {
  return user?.team?.slug === POLITICAL_SLUG && !!user.capabilities?.includes("datasets.use");
}

export function canUseWidget(type: string, capabilities: readonly string[] = []): boolean {
  const capability = (
    { analytics: "analytics.use", rss: "rss.use", records: "datasets.use" } as Record<
      string,
      string
    >
  )[type];
  return !capability || capabilities.includes(capability);
}

export function accessContext(
  user: { id: number; role?: string; team?: { id: number }; capabilities?: string[] } | null,
): string {
  return user
    ? `${user.id}:${user.team?.id ?? "unverified"}:${user.role ?? "viewer"}:${[...new Set(user.capabilities ?? [])].sort().join(",")}`
    : "anonymous";
}
