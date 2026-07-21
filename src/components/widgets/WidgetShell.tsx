import { useWorkspaceStore } from "../../stores/useWorkspaceStore";

interface Props {
  id: string;
  title: string;
  children: React.ReactNode;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

// Base widget IDs that should hide (toggle) rather than be permanently deleted
const BASE_WIDGET_IDS = new Set([
  "analyticsPanel",
  "rssFeedPanel",
  "recordsPanel",
  "videoPanel",
  "disasterPanel",
]);

export default function WidgetShell({
  id,
  title,
  children,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const toggleWidget = useWorkspaceStore((s) => s.toggleWidget);
  const deleteWidget = useWorkspaceStore((s) => s.deleteWidget);
  const duplicateWidget = useWorkspaceStore((s) => s.duplicateWidget);

  const handleClose = BASE_WIDGET_IDS.has(id) ? () => toggleWidget(id) : () => deleteWidget(id);

  return (
    <div
      className={[
        "flex min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all",
        isDragging ? "opacity-40 scale-[0.98]" : "",
        isDragOver ? "ring-2 ring-inset ring-red-400 bg-red-50/30" : "",
      ].join(" ")}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Title bar — drag handle for reordering */}
      <div
        className="flex shrink-0 cursor-grab items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 select-none active:cursor-grabbing"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag dots */}
          <svg className="h-3 w-3 shrink-0 text-slate-300" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="4" cy="3" r="1" />
            <circle cx="8" cy="3" r="1" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="6" r="1" />
            <circle cx="4" cy="9" r="1" />
            <circle cx="8" cy="9" r="1" />
          </svg>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => duplicateWidget(id)}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors text-base leading-none"
            title="Duplicate panel"
          >
            ⎘
          </button>
          <button
            onClick={handleClose}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors text-base leading-none"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
