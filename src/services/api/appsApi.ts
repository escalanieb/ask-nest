import { apiFetch } from "./_fetch";

export interface TeamApp {
  id: number;
  label: string;
  url: string;
}

export interface TeamAppInput {
  label: string;
  url: string;
}

const json = (method: string, data: TeamAppInput): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const appsApi = {
  list: (): Promise<TeamApp[]> => apiFetch<TeamApp[]>("/apps"),
  create: (data: TeamAppInput): Promise<TeamApp> => apiFetch<TeamApp>("/apps", json("POST", data)),
  update: (id: number, data: TeamAppInput): Promise<TeamApp> =>
    apiFetch<TeamApp>(`/apps/${id}`, json("PUT", data)),
  remove: (id: number): Promise<void> => apiFetch<void>(`/apps/${id}`, { method: "DELETE" }),
};

/** apiFetch reports 422s as `API error 422: {json}`; pull out the first message. */
export function appsErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const body = text.replace(/^API error \d+: /, "");
  try {
    const parsed = JSON.parse(body) as { message?: string; errors?: Record<string, string[]> };
    return Object.values(parsed.errors ?? {})[0]?.[0] ?? parsed.message ?? text;
  } catch {
    return text;
  }
}
