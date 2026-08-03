export interface Sentiment {
  overall_sentiment: "positive" | "negative" | "neutral" | "mixed" | string;
  positive: string;
  negative: string;
  neutral: string;
  mixed: string;
  risk_level: string;
  total_comments: number;
}

export interface NewsItem {
  id: number;
  title: string;
  link: string;
  source?: string | null;
  sentiment: Sentiment;
  summary: string;
  main_themes: string[];
  reco_action: string;
  comment_count?: number | null;
  reaction_count?: number | null;
  reactions?: {
    like?: number;
    love?: number;
    haha?: number;
    wow?: number;
    sad?: number;
    angry?: number;
    care?: number;
  } | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface NewsPageMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface NewsPageLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedNewsResponse {
  data: NewsItem[];
  links?: NewsPageLinks;
  meta?: NewsPageMeta;
}

export interface ValidationErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
