// Node resolve hook for tests that import app modules which use Vite-style extensionless
// relative imports ("../lib/session"). Tries .ts and /index.ts when Node cannot resolve them.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
    for (const suffix of [".ts", ".tsx", "/index.ts"]) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        /* try the next suffix */
      }
    }
    throw error;
  }
}
