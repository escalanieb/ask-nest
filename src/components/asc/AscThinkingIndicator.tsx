export default function AscThinkingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="ASC is thinking">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 rounded-full bg-slate-400 animate-[asc-dot-pulse_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
