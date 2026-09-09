import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  isLoading: boolean;
}

export default function AscChatInput({ onSend, onStop, isStreaming, isLoading }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 108)}px`;
  }, [value]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!value.trim() || isStreaming || isLoading) return;
    onSend(value);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          aria-label="Message ASC GPT"
          placeholder="Ask about Senator Cayetano's legislation, positions, or statements..."
          className="max-h-[108px] min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-[12px] leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-wait"
        />
        <button
          type={isStreaming ? "button" : "submit"}
          onClick={isStreaming ? onStop : undefined}
          disabled={!isStreaming && (!value.trim() || isLoading)}
          aria-label={isStreaming ? "Stop response" : "Send message"}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isStreaming ? (
            <Square className="size-3.5 fill-current" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-4xl text-center text-[9px] text-slate-400">
        Answers are grounded in the office knowledge base. Verify critical details against cited
        sources.
      </p>
    </form>
  );
}
