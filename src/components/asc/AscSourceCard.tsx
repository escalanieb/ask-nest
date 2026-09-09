import { ExternalLink, FileText } from "lucide-react";
import type { AscSource } from "../../types/asc";
import { Badge } from "../ui/badge";

const CATEGORY_STYLES: Record<string, string> = {
  bills_filed: "border-blue-200 bg-blue-50 text-blue-700",
  bills_enacted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  press: "border-amber-200 bg-amber-50 text-amber-700",
  statements: "border-purple-200 bg-purple-50 text-purple-700",
  media_kit: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function AscSourceCard({ source }: { source: AscSource }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <FileText aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">
            {source.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`h-4 px-1.5 text-[9px] ${CATEGORY_STYLES[source.category] ?? CATEGORY_STYLES.media_kit}`}
            >
              {source.category.replaceAll("_", " ")}
            </Badge>
            {source.date && <span className="text-[9px] text-slate-500">{source.date}</span>}
          </div>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-red-600 hover:text-red-700 hover:underline"
            >
              <span className="truncate">{source.url}</span>
              <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
