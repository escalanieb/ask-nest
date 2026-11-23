import { tryRefresh } from "./api/_fetch";
import { assertSession, sessionFetch, sessionGeneration } from "../lib/session";
import { useAuthStore } from "../stores/useAuthStore";
import type {
  ChroniclesEntry,
  ChroniclesTimeline,
  EntriesPage,
  ImportPreview,
} from "../types/chronicles";

/**
 * Chronicles API client.
 *
 * There is no separate Chronicles login: the ask-nest session token is sent as-is and the
 * Chronicles API checks it against ask-nest (and the `chronicles.use` capability).
 */
const BASE_URL = (import.meta.env?.VITE_CHRONICLES_API_URL ?? "http://localhost:8002/api").replace(
  /\/$/,
  "",
);
export const CHRONICLES_ROOT_DOMAIN: string =
  import.meta.env?.VITE_CHRONICLES_ROOT_DOMAIN ?? "timeline.asc-nest.org";
export const CHRONICLES_CAPABILITY = "chronicles.use";

export class ChroniclesApiError extends Error {
  status: number;
  details: Record<string, unknown>;
  constructor(message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ChroniclesApiError";
    this.status = status;
    this.details = details;
  }
}

/** Address of a timeline's public page (served by the separate public app). */
export function publicUrl(slug: string): string {
  return `https://${slug}.${CHRONICLES_ROOT_DOMAIN}`;
}

function send(path: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");
  return sessionFetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const state = useAuthStore.getState();
  if (!state.user?.capabilities?.includes(CHRONICLES_CAPABILITY))
    throw new ChroniclesApiError("Chronicles is not enabled for your account.", 403);
  if (!state.token) throw new ChroniclesApiError("Sign in again to continue.", 401);
  const expected = sessionGeneration();
  let res = await send(path, init, state.token);
  // An expired ask-nest token is refreshed once, the same way the other tools do it.
  if (res.status === 401) {
    const fresh = await tryRefresh();
    assertSession(expected);
    if (!fresh) {
      useAuthStore.getState().clearSession();
      throw new ChroniclesApiError("Session expired. Please log in again.", 401);
    }
    res = await send(path, init, fresh);
  }
  assertSession(expected);
  return res;
}

async function failure(res: Response): Promise<ChroniclesApiError> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    errors?: unknown;
  };
  const errors =
    data.errors && !Array.isArray(data.errors)
      ? Object.values(data.errors as Record<string, string[]>)
          .flat()
          .join(" ")
      : "";
  return new ChroniclesApiError(
    errors || data.message || data.error || "The request failed.",
    res.status,
    data as Record<string, unknown>,
  );
}

export async function chroniclesFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await request(path, init);
  if (!res.ok) throw await failure(res);
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => undefined)) as T;
}

/** Authenticated binary download (entry images, Excel template). */
export async function chroniclesBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await request(path, { signal, headers: { Accept: "*/*" } });
  if (!res.ok) throw await failure(res);
  return res.blob();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export interface EntryFilters {
  page: number;
  search: string;
  issueCategory: string;
  status: string;
  severity: string;
}

export const chroniclesApi = {
  timelines: () => chroniclesFetch<ChroniclesTimeline[]>("/admin/timelines"),
  timeline: (id: number | string) => chroniclesFetch<ChroniclesTimeline>(`/admin/timelines/${id}`),
  saveTimeline: (id: number | string | undefined, data: Partial<ChroniclesTimeline>) =>
    chroniclesFetch<ChroniclesTimeline>(
      id ? `/admin/timelines/${id}` : "/admin/timelines",
      json(id ? "PUT" : "POST", data),
    ),
  deleteTimeline: (id: number | string, confirmation: string) =>
    chroniclesFetch<void>(`/admin/timelines/${id}`, json("DELETE", { confirmation })),
  archive: (id: number) => chroniclesFetch<void>(`/admin/timelines/${id}/archive`, json("POST")),
  restore: (id: number) => chroniclesFetch<void>(`/admin/timelines/${id}/restore`, json("POST")),
  clone: (id: number, data: { name: string; slug: string; withEntries: boolean }) =>
    chroniclesFetch<ChroniclesTimeline>(`/admin/timelines/${id}/clone`, json("POST", data)),
  entries: (id: number | string, f: EntryFilters) =>
    chroniclesFetch<EntriesPage>(
      `/admin/timelines/${id}/entries?${new URLSearchParams({
        page: String(f.page),
        search: f.search,
        issueCategory: f.issueCategory,
        status: f.status,
        severity: f.severity,
      })}`,
    ),
  saveEntry: (timelineId: number | string, entryId: number | string | undefined, data: unknown) =>
    chroniclesFetch<ChroniclesEntry>(
      `/admin/timelines/${timelineId}/entries${entryId ? `/${entryId}` : ""}`,
      json(entryId ? "PUT" : "POST", data),
    ),
  deleteEntry: (timelineId: number | string, entryId: number | string) =>
    chroniclesFetch<void>(`/admin/timelines/${timelineId}/entries/${entryId}`, json("DELETE")),
  uploadImage: (timelineId: number | string, file: File) => {
    const form = new FormData();
    form.set("image", file);
    return chroniclesFetch<{ path: string }>(`/admin/timelines/${timelineId}/images`, {
      method: "POST",
      body: form,
    });
  },
  entryImage: (timelineId: number | string, entryId: number | string, signal?: AbortSignal) =>
    chroniclesBlob(`/admin/timelines/${timelineId}/entries/${entryId}/image`, signal),
  importWorkbook: (
    id: number | string,
    data: { file: File; mode: "preview" | "commit"; strategy: string; confirmation: string },
  ) => {
    const form = new FormData();
    form.set("file", data.file);
    form.set("mode", data.mode);
    form.set("strategy", data.strategy);
    form.set("confirmation", data.confirmation);
    return chroniclesFetch<ImportPreview>(`/admin/timelines/${id}/import`, {
      method: "POST",
      body: form,
    });
  },
};

export async function downloadTemplate(id: number | string): Promise<void> {
  let blob: Blob;
  try {
    blob = await chroniclesBlob(`/admin/timelines/${id}/import-template`);
  } catch {
    throw new Error("Template download failed. Sign in again if your session expired.");
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "timeline-template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
