export type PersonInvolved = { name: string; role: string; affiliation?: string };
export type SourceItem = { label: string; url?: string; publisher?: string; publishedAt?: string };
export type Quote = { speaker: string; text: string };

export interface ChroniclesEntry {
  id: number | string;
  /** ISO 8601, e.g. 2026-05-20 */
  date: string;
  dateLabel: string;
  time?: string | null;
  title: string;
  shortSummary: string;
  whatHappened: string;
  quotes?: Quote[];
  peopleInvolved: PersonInvolved[];
  issueCategory: string;
  impact: string;
  sourceUsed: SourceItem[];
  imageUrl?: string | null;
  youtubeUrl?: string | null;
  isFeatured?: boolean;
  status?: string;
  severity?: string | null;
  tags?: string[];
}

export type TimelineStatus = "draft" | "published" | "archived";

export interface TimelineTheme {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  heroTitle?: string;
  heroDescription?: string;
}

export interface TimelineConfig {
  categories: { key: string; label: string; color: string }[];
  statuses: string[];
  severities: string[];
  features: { quotes: boolean };
}

export interface ChroniclesTimeline {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  status: TimelineStatus;
  theme: TimelineTheme;
  config: TimelineConfig;
  entries_count?: number;
  updated_at?: string;
  entries_max_updated_at?: string;
}

export interface EntriesPage {
  data: ChroniclesEntry[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface ImportPreview {
  totalRows: number;
  wouldCreate: number;
  created?: number;
  errors: { row: number; columns: Record<string, string[]> }[];
}
