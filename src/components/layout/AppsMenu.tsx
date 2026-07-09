import { useState, useRef, useEffect } from "react";
import TalaIcon from "../../assets/app_icons/tala.svg?react";
import InsightIcon from "../../assets/app_icons/insight.svg?react";


// ── Icons ─────────────────────────────────────────────────────────────────

const AppsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <rect x="3" y="3" width="4" height="4" rx="1" />
    <rect x="10" y="3" width="4" height="4" rx="1" />
    <rect x="17" y="3" width="4" height="4" rx="1" />
    <rect x="3" y="10" width="4" height="4" rx="1" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <rect x="17" y="10" width="4" height="4" rx="1" />
    <rect x="3" y="17" width="4" height="4" rx="1" />
    <rect x="10" y="17" width="4" height="4" rx="1" />
    <rect x="17" y="17" width="4" height="4" rx="1" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5 opacity-50 shrink-0"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// Renders the first letter of a label as a filled character — used as a
// fallback when no icon asset is provided for an app link.
const LetterIcon = ({ label }: { label: string }) => {
  const letter = label.trim()[0]?.toUpperCase() ?? "?";
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full"
      aria-hidden="true"
    >
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontSize="15"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fill="currentColor"
      >
        {letter}
      </text>
    </svg>
  );
};

// ── Types & data ──────────────────────────────────────────────────────────

interface AppLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const APP_LINKS: AppLink[] = [
  {
    label: "TALA",
    href: "https://tala.asc-nest.org/",
    icon: (
      <TalaIcon className="h-7 w-7" />
    ),
  },
  {
    label: "Insight",
    href: "https://insight.asc-nest.org/",
    icon: (
      <InsightIcon className="h-7 w-7" />
    ),
  },
  {
    label: "TIPAS",
    href: "https://tipas.asc-nest.org/",
  },
  {
    label: "NEXUS",
    href: "https://nexus.asc-nest.org/",
  },
  {
    label: "Senate Watch",
    href: "https://senate-watch.asc-nest.org/",
  },
];

// ── Component ─────────────────────────────────────────────────────────────

export default function AppsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Apps"
        aria-label="Apps"
        className={[
          "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          open
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:bg-slate-800 hover:text-white",
        ].join(" ")}
      >
        <AppsIcon />
        {/* Tooltip — hidden when menu is open */}
        {!open && (
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-[9999]">
            Apps
          </span>
        )}
      </button>

      {/* Flyout panel */}
      {open && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[9999] w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
          style={{ animation: "appsMenuIn 0.15s ease" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2.5">
            <AppsIcon />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Apps
            </span>
          </div>

          {/* Link list */}
          <ul className="py-1">
            {APP_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400">
                    {link.icon ?? <LetterIcon label={link.label} />}
                  </span>
                  <span className="flex-1 leading-tight">{link.label}</span>
                  <ExternalLinkIcon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes appsMenuIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  );
}
