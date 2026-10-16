export type UserRole = "admin" | "data_manager" | "viewer";

export function canManageDatasets(
  user: { role: string; capabilities?: readonly string[] } | null | undefined,
): boolean {
  return Boolean(
    user &&
    (user.role === "admin" || user.role === "data_manager") &&
    user.capabilities?.includes("datasets.use"),
  );
}
