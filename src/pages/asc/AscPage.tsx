import { useEffect, useState } from "react";
import { PanelLeftOpen, Sparkles } from "lucide-react";
import AscChatView from "../../components/asc/AscChatView";
import AscConversationSidebar from "../../components/asc/AscConversationSidebar";
import { useAscStore } from "../../stores/useAscStore";

export default function AscPage() {
  const [historyOpen, setHistoryOpen] = useState(true);
  const conversationId = useAscStore((state) => state.conversationId);
  const messages = useAscStore((state) => state.messages);
  const isStreaming = useAscStore((state) => state.isStreaming);
  const isLoading = useAscStore((state) => state.isLoading);
  const error = useAscStore((state) => state.error);
  const conversations = useAscStore((state) => state.conversations);
  const conversationsLoading = useAscStore((state) => state.conversationsLoading);
  const sendMessage = useAscStore((state) => state.sendMessage);
  const cancelStream = useAscStore((state) => state.cancelStream);
  const loadConversation = useAscStore((state) => state.loadConversation);
  const newConversation = useAscStore((state) => state.newConversation);
  const loadConversations = useAscStore((state) => state.loadConversations);
  const deleteConversation = useAscStore((state) => state.deleteConversation);
  const clearError = useAscStore((state) => state.clearError);

  useEffect(() => {
    void loadConversations();
    return cancelStream;
  }, [cancelStream, loadConversations]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <header className="sticky top-0 z-10 shrink-0 border-b border-[#e5e7eb] bg-white/80 px-6 py-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {!historyOpen && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label="Show conversation history"
                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            )}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <Sparkles className="size-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-none text-[#374151]">
                ASC GPT
              </h1>
              <p className="mt-0.5 truncate text-xs text-[#6b7280]">AI Legislative Advisor</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
            Knowledge grounded
          </span>
        </div>
      </header>

      {error && (
        <div className="flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-5 py-2 text-[10px] text-red-700">
          <span className="truncate">{error}</span>
          <button type="button" onClick={clearError} className="ml-3 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {historyOpen && (
          <AscConversationSidebar
            conversations={conversations}
            activeId={conversationId}
            loading={conversationsLoading}
            onNew={newConversation}
            onLoad={(id) => void loadConversation(id)}
            onDelete={(id) => void deleteConversation(id)}
            onCollapse={() => setHistoryOpen(false)}
          />
        )}
        <AscChatView
          messages={messages}
          isStreaming={isStreaming}
          isLoading={isLoading}
          onSend={(message) => void sendMessage(message)}
          onStop={cancelStream}
        />
      </main>
    </div>
  );
}
