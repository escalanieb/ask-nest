import { sessionGeneration, assertSession } from "../lib/session";
import { create } from "zustand";
import {
  deleteAscConversation,
  getAscConversation,
  getAscConversations,
  streamAscMessage,
} from "../services/api/ascApi";
import type { AscConversation, AscMessage, AscSource } from "../types/asc";

interface AscState {
  conversationId: number | null;
  messages: AscMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  abortController: AbortController | null;
  conversations: AscConversation[];
  conversationsLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  cancelStream: () => void;
  loadConversation: (id: number) => Promise<void>;
  newConversation: () => void;
  loadConversations: () => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  clearError: () => void;
}

function messageId() {
  return crypto.randomUUID();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export const useAscStore = create<AscState>()((set, get) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  isLoading: false,
  error: null,
  abortController: null,
  conversations: [],
  conversationsLoading: false,

  sendMessage: async (text) => {
    const expected = sessionGeneration();
    const content = text.trim();
    if (!content || get().isStreaming) return;

    const assistantId = messageId();
    const controller = new AbortController();
    const now = new Date();
    set((state) => ({
      messages: [
        ...state.messages,
        { id: messageId(), role: "user", content, timestamp: now },
        { id: assistantId, role: "assistant", content: "", timestamp: now },
      ],
      isStreaming: true,
      isLoading: true,
      error: null,
      abortController: controller,
    }));

    const updateAssistant = (update: (message: AscMessage) => AscMessage) => {
      if (expected !== sessionGeneration()) return;
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === assistantId ? update(message) : message,
        ),
      }));
    };

    try {
      await streamAscMessage(
        content,
        get().conversationId,
        {
          onToken: (token) => {
            if (expected === sessionGeneration()) set({ isLoading: false });
            updateAssistant((message) => ({ ...message, content: message.content + token }));
          },
          onSources: (sources: AscSource[]) => {
            updateAssistant((message) => ({ ...message, sources }));
          },
          onDone: (conversationId) => {
            if (expected === sessionGeneration()) set({ conversationId });
          },
        },
        controller.signal,
      );
      assertSession(expected);
      await get().loadConversations();
    } catch (error) {
      if (expected !== sessionGeneration()) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      set({ error: errorMessage(error) });
      updateAssistant((message) =>
        message.content
          ? message
          : { ...message, content: "The response could not be loaded. Please try again." },
      );
    } finally {
      if (get().abortController === controller) {
        set({ isStreaming: false, isLoading: false, abortController: null });
      }
    }
  },

  cancelStream: () => {
    get().abortController?.abort();
    set({ isStreaming: false, isLoading: false, abortController: null });
  },

  loadConversation: async (id) => {
    const expected = sessionGeneration();
    get().cancelStream();
    set({ isLoading: true, error: null });
    try {
      const conversation = await getAscConversation(id);
      assertSession(expected);
      set({
        conversationId: conversation.id,
        messages: conversation.messages.map((message) => ({
          id: String(message.id),
          role: message.role,
          content: message.content,
          sources: message.sources ?? undefined,
          timestamp: new Date(message.created_at),
        })),
      });
    } catch (error) {
      if (expected !== sessionGeneration()) return;
      set({ error: errorMessage(error) });
    } finally {
      if (expected === sessionGeneration()) set({ isLoading: false });
    }
  },

  newConversation: () => {
    get().cancelStream();
    set({ conversationId: null, messages: [], error: null });
  },

  loadConversations: async () => {
    const expected = sessionGeneration();
    set({ conversationsLoading: true });
    try {
      const conversations = await getAscConversations();
      assertSession(expected);
      set({ conversations });
    } catch (error) {
      if (expected !== sessionGeneration()) return;
      set({ error: errorMessage(error) });
    } finally {
      if (expected === sessionGeneration()) set({ conversationsLoading: false });
    }
  },

  deleteConversation: async (id) => {
    const expected = sessionGeneration();
    try {
      await deleteAscConversation(id);
      assertSession(expected);
      set((state) => ({
        conversations: state.conversations.filter((conversation) => conversation.id !== id),
        ...(state.conversationId === id ? { conversationId: null, messages: [] } : {}),
      }));
    } catch (error) {
      if (expected !== sessionGeneration()) return;
      set({ error: errorMessage(error) });
    }
  },

  clearError: () => set({ error: null }),
}));
