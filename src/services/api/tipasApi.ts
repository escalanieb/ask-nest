import { apiFetch } from "./_fetch";

export interface TipasEvent {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  psgc_code: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  start_time: string;
  end_time: string | null;
  registered_count: number;
  checked_in_count: number;
}

export interface TipasAttendee {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  city: string | null;
  municipality: string | null;
  province: string | null;
  psgc_code: string | null;
  checked_in_at: string | null;
  registration_type: string | null;
}

export interface TipasDistributionPoint {
  psgc_code: string;
  count: number;
}

export interface PaginatedTipasAttendees {
  data: TipasAttendee[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Fetch all events from TIPAS.
 */
export async function fetchTipasEvents(): Promise<TipasEvent[]> {
  return apiFetch<TipasEvent[]>("/tipas/events");
}

/**
 * Fetch paginated list of attendees for a specific TIPAS event.
 */
export async function fetchTipasEventAttendees(
  eventId: number,
  params?: Record<string, string>,
): Promise<PaginatedTipasAttendees> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return apiFetch<PaginatedTipasAttendees>(`/tipas/events/${eventId}/attendees${qs}`);
}

/**
 * Fetch attendee distribution (headcounts grouped by PSGC codes).
 */
export async function fetchTipasAttendeesDistribution(
  eventId?: number,
): Promise<TipasDistributionPoint[]> {
  const qs = eventId ? `?event_id=${eventId}` : "";
  return apiFetch<TipasDistributionPoint[]>(`/tipas/attendees-distribution${qs}`);
}
