export interface AscSource {
  title: string;
  date: string | null;
  url: string | null;
  category: string;
}

export interface AscMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AscSource[];
  timestamp: Date;
}

export interface AscConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
}

export interface AscApiMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources: AscSource[] | null;
  created_at: string;
}

export interface AscConversationDetail extends Omit<AscConversation, "messages_count"> {
  messages: AscApiMessage[];
}

export interface AscChatResponse {
  type: "answer" | "refusal";
  conversation_id: number;
  answer: string;
  sources: AscSource[];
}

export type AscStreamEvent =
  | { type: "response_type"; value: AscChatResponse["type"] }
  | { type: "token"; content: string }
  | { type: "sources"; sources: AscSource[] }
  | { type: "done"; conversation_id: number }
  | { type: "error"; message: string };
