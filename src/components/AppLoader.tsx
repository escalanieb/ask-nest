import NestLogo from "./NestLogo";

/**
 * Full-screen branded boot loader.
 * Shown on app start while the auth store hydrates from localStorage.
 * White background so both the black ribbon and red text are visible.
 */
export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none">
      {/* Logo */}
      <div
        style={{
          animation: "nest-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
          opacity: 0,
        }}
      >
        <NestLogo width={220} />
      </div>

      {/* Subtitle */}
      <p
        className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
        style={{
          animation:
            "nest-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s forwards",
          opacity: 0,
        }}
      >
        Communications Dashboard
      </p>

      {/* Pulsing dots */}
      <div
        className="mt-8 flex items-center gap-1.5"
        style={{
          animation: "nest-fade-up 0.5s ease-out 0.5s forwards",
          opacity: 0,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-red-500"
            style={{
              animation: `nest-pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 overflow-hidden">
        <div
          className="h-full w-full origin-left bg-red-600"
          style={{
            animation: "nest-bar-fill 1.8s cubic-bezier(0.4,0,0.2,1) forwards",
          }}
        />
      </div>
    </div>
  );
}
