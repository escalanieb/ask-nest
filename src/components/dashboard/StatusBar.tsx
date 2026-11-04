export default function StatusBar() {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-end border-t border-slate-200 bg-white px-4 text-[11px] text-slate-400">
      <div className="flex items-center gap-3">
        <span>Communications Dashboard</span>
        <span className="h-3.5 w-px bg-slate-200" />
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
