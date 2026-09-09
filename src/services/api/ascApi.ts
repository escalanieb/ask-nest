import type {
  AscChatResponse,
  AscConversation,
  AscConversationDetail,
  AscSource,
  AscStreamEvent,
} from "../../types/asc";
import { apiFetch, apiRequest } from "./_fetch";

interface StreamCallbacks {
  onToken: (token: string) => void;
  onSources: (sources: AscSource[]) => void;
  onDone: (conversationId: number) => void;
  onType?: (type: AscChatResponse["type"]) => void;
}

function dispatchEvent(event: AscStreamEvent, callbacks: StreamCallbacks) {
  if (event.type === "token") callbacks.onToken(event.content);
  if (event.type === "sources") callbacks.onSources(event.sources);
  if (event.type === "done") callbacks.onDone(event.conversation_id);
  if (event.type === "response_type") callbacks.onType?.(event.value);
  if (event.type === "error") throw new Error(event.message);
}

export async function streamAscMessage(
  message: string,
  conversationId: number | null,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const response = await apiRequest("/ai/asc/chat", {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversation_id: conversationId, message }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  if (!response.body) throw new Error("The ASC response stream is unavailable.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const payload = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (payload) dispatchEvent(JSON.parse(payload) as AscStreamEvent, callbacks);
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const payload = buffer.replace(/^data:\s?/, "").trim();
    if (payload) dispatchEvent(JSON.parse(payload) as AscStreamEvent, callbacks);
  }
}

export function getAscConversations(): Promise<AscConversation[]> {
  return apiFetch<AscConversation[]>("/ai/asc/conversations");
}

export function getAscConversation(id: number): Promise<AscConversationDetail> {
  return apiFetch<AscConversationDetail>(`/ai/asc/conversations/${id}`);
}

export function deleteAscConversation(id: number): Promise<void> {
  return apiFetch<void>(`/ai/asc/conversations/${id}`, { method: "DELETE" });
}
