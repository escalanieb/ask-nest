import { MessageSquareText, Scale, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "What education bills has the Senator filed?",
  "What is his position on digital connectivity?",
  "Draft talking points on MSME support",
  "What enacted laws relate to public health?",
];

export default function AscEmptyState({ onSelect }: { onSelect: (suggestion: string) => void }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <Scale className="size-6" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">
          <Sparkles className="size-3" /> ASC GPT
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">ASC AI Legislative Advisor</h2>
        <p className="mx-auto mt-2 max-w-lg text-[12px] leading-5 text-slate-500">
          Ask about bills, public positions, statements, and legislation in the verified office
          knowledge base.
        </p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-[11px] leading-4 text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50/50 hover:text-slate-800"
            >
              <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-slate-400 group-hover:text-red-500" />
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
