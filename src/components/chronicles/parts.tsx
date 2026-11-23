import { Link, useLocation } from "react-router-dom";
import { FileSpreadsheet, List, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared look for Chronicles forms, so the screens read like the rest of ask-nest. */
export const panelClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export const selectClass =
  "h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-medium text-slate-700", className)}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {children}
    </p>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mt-2 border-t border-slate-200 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

const STATE_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
  developing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  archived: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

export function StateBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        STATE_STYLES[value] ?? "bg-slate-100 text-slate-600 ring-slate-500/20",
      )}
    >
      {value}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 truncate text-sm font-medium text-team">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-start justify-end gap-2">{actions}</div>}
    </div>
  );
}

/** Entries / Excel import / Settings tabs for one timeline. */
export function TimelineTabs({ id }: { id: string }) {
  const { pathname } = useLocation();
  const items = [
    { label: "Entries", path: "entries", icon: List },
    { label: "Excel import", path: "import", icon: FileSpreadsheet },
    { label: "Settings", path: "settings", icon: Settings },
  ];
  return (
    <nav className="mb-6 flex gap-1 border-b border-slate-200" aria-label="Timeline management">
      {items.map(({ label, path, icon: Icon }) => {
        const to = `/chronicles/timelines/${id}/${path}`;
        const active = pathname === to;
        return (
          <Link
            key={path}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
              active
                ? "border-team text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TimelineCardsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Fetching timelines"
      className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} aria-hidden="true" className={cn(panelClass, "space-y-4 p-5")}>
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="size-8" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-between border-t border-slate-200 pt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className={cn(panelClass, "space-y-5 p-6")}>
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} aria-hidden="true" className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
