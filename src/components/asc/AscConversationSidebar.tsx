import { LoaderCircle, MessageSquare, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import type { AscConversation } from "../../types/asc";

interface Props {
  conversations: AscConversation[];
  activeId: number | null;
  loading: boolean;
  onNew: () => void;
  onLoad: (id: number) => void;
  onDelete: (id: number) => void;
  onCollapse: () => void;
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 60) return RELATIVE_TIME_FORMATTER.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return RELATIVE_TIME_FORMATTER.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE_TIME_FORMATTER.format(hours, "hour");
  return RELATIVE_TIME_FORMATTER.format(Math.round(hours / 24), "day");
}

export default function AscConversationSidebar({
  conversations,
  activeId,
  loading,
  onNew,
  onLoad,
  onDelete,
  onCollapse,
}: Props) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={onNew}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-[11px] font-semibold text-white transition hover:bg-red-700"
        >
          <Plus className="size-3.5" /> New Chat
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse conversation history"
          className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <LoaderCircle className="size-4 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="mx-auto size-5 text-slate-300" />
            <p className="mt-2 text-[10px] text-slate-400">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-lg border-l-2 transition ${
                  activeId === conversation.id
                    ? "border-red-500 bg-slate-200/70"
                    : "border-transparent hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onLoad(conversation.id)}
                  className="w-full px-3 py-2.5 pr-8 text-left"
                >
                  <span className="block truncate text-[10px] font-medium text-slate-700">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block text-[9px] text-slate-400">
                    {relativeTime(conversation.updated_at)} · {conversation.messages_count} messages
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(conversation.id)}
                  aria-label={`Delete ${conversation.title}`}
                  className="absolute right-1.5 top-2 flex size-6 items-center justify-center rounded text-slate-400 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
