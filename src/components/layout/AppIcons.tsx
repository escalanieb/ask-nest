import TalaIcon from "../../assets/app_icons/tala.svg?react";
import InsightTileIcon from "../../assets/app_icons/insight.svg?react";
import { letterColor, type AppIconKey } from "../../lib/appRegistry";

export const MapIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

export const DatasetIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

export const InsightIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const AscGptIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h5" />
    <path d="m18 2 .55 1.45L20 4l-1.45.55L18 6l-.55-1.45L16 4l1.45-.55z" />
    <path d="m20.5 8 .4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" />
  </svg>
);

export const HomeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

/** First letter of a label, filled with currentColor. */
export const LetterIcon = ({ label }: { label: string }) => {
  const letter = label.trim()[0]?.toUpperCase() ?? "?";
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
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

const GLYPHS: Record<AppIconKey, () => React.ReactNode> = {
  map: () => <MapIcon />,
  datasets: () => <DatasetIcon />,
  insight: () => <InsightTileIcon className="h-7 w-7" />,
  asc: () => <AscGptIcon />,
  tala: () => <TalaIcon className="h-7 w-7" />,
};

/** Small monochrome glyph for menus: asset icon when one exists, else the letter. */
export function AppGlyph({ icon, label }: { icon?: AppIconKey; label: string }) {
  return <>{icon ? GLYPHS[icon]() : <LetterIcon label={label} />}</>;
}

/** Large rounded tile for the launcher. Custom apps get a coloured letter. */
export function AppTile({
  icon,
  label,
  custom,
}: {
  icon?: AppIconKey;
  label: string;
  custom?: boolean;
}) {
  if (custom || !icon) {
    return (
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-sm"
        style={{ backgroundColor: letterColor(label) }}
        aria-hidden="true"
      >
        {label.trim()[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  return (
    <span
      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-sm [&_svg]:h-8 [&_svg]:w-8"
      aria-hidden="true"
    >
      {GLYPHS[icon]()}
    </span>
  );
}
