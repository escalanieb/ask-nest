import type { ReactNode } from "react";

export default function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-team text-[11px] text-white">
          {n}
        </span>
        {title}
      </h2>
      {hint && <p className="mb-2 mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </section>
  );
}
