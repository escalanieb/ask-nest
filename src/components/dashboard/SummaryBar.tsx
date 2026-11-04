import { useExplore } from "../../hooks/useExplore";

export default function SummaryBar() {
  const { datasetId, sentence, chips, removeChip, clearAll } = useExplore();

  return (
    <div
      className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-1.5"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-slate-700">{sentence}</p>
      {datasetId &&
        chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-full border border-team bg-team-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-team"
          >
            {chip.label}
            <button
              type="button"
              aria-label={`Remove filter: ${chip.label}`}
              onClick={() => removeChip(chip)}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white"
            >
              ×
            </button>
          </span>
        ))}
      {datasetId && chips.length > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-semibold text-slate-500 underline hover:text-slate-700"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
