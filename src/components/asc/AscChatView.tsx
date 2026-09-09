import { useEffect, useRef } from "react";
import type { AscMessage as AscMessageType } from "../../types/asc";
import AscChatInput from "./AscChatInput";
import AscEmptyState from "./AscEmptyState";
import AscMessage from "./AscMessage";
import AscThinkingIndicator from "./AscThinkingIndicator";

interface Props {
  messages: AscMessageType[];
  isStreaming: boolean;
  isLoading: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

export default function AscChatView({ messages, isStreaming, isLoading, onSend, onStop }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestContent = messages.at(-1)?.content;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
  }, [messages.length, latestContent, isStreaming]);

  const pendingId = isLoading ? messages.at(-1)?.id : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-slate-100/60">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <AscEmptyState onSelect={onSend} />
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-6">
            {messages.map((message, index) =>
              message.id === pendingId && !message.content ? null : (
                <AscMessage
                  key={message.id}
                  message={message}
                  streaming={
                    isStreaming && index === messages.length - 1 && Boolean(message.content)
                  }
                />
              ),
            )}
            {isLoading && <AscThinkingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <AscChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        isLoading={isLoading}
      />
    </section>
  );
}
