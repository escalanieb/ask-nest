import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { importSteps } from "../../../lib/guidedImport";

export default function ImportLayout({
  step,
  team,
  expiry,
  hasSession,
  completed,
  busy,
  children,
  onLeave,
}: {
  step: number;
  team?: string;
  expiry: string;
  hasSession: boolean;
  completed: boolean;
  busy: string;
  children: ReactNode;
  onLeave: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [step]);
  return (
    <div
      ref={scroller}
      className="h-full min-h-0 overflow-y-auto bg-slate-50 text-slate-800"
      data-testid="guided-import-scroll"
    >
      <header className="border-b border-slate-200 bg-white px-5 py-5 lg:px-9">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              disabled={!!busy}
              onClick={onLeave}
              aria-label="Back to datasets"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-team">
                Your team’s data
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                Import dataset
              </h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-600">{team}</p>
            <p className="mt-1 text-xs text-slate-400">
              {completed
                ? "Import complete"
                : busy || (hasSession ? "Private draft" : "Guided import")}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-9 lg:py-9">
        <aside className="min-w-0">
          <nav aria-label="Import progress" className="lg:sticky lg:top-6">
            <ol className="flex flex-wrap gap-x-4 gap-y-3 lg:block lg:space-y-5">
              {importSteps.map((label, index) => (
                <li
                  key={label}
                  aria-current={step === index ? "step" : undefined}
                  className="flex items-center gap-3"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index < step ? "bg-team/10 text-team" : index === step ? "bg-team text-team-foreground" : "border border-slate-200 bg-white text-slate-400"}`}
                  >
                    {index < step ? <Check size={15} aria-hidden="true" /> : index + 1}
                  </span>
                  <span
                    className={`text-xs ${index === step ? "font-semibold text-slate-900" : "text-slate-500"}`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 hidden rounded-xl border border-slate-200 bg-white p-4 lg:block">
              <ShieldCheck className="text-team" size={20} aria-hidden="true" />
              <p className="mt-3 text-xs font-semibold text-slate-700">Review before publishing</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Your dataset and records change only after final confirmation.
              </p>
            </div>
            {hasSession && !completed && (
              <p className="mt-4 text-[11px] leading-5 text-slate-400">
                Draft expires {expiry} after seven inactive days. Setup saves your choices, not your
                spreadsheet.
              </p>
            )}
          </nav>
        </aside>
        <section className="min-w-0 space-y-4">{children}</section>
      </main>
    </div>
  );
}
