import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api/_fetch";
import { useAuthStore, type AuthUser } from "../../stores/useAuthStore";

interface DevTeam {
  id: number;
  slug: string;
  name: string;
  current: boolean;
}

/**
 * Local-only: lets the dev admin move between teams. Renders nothing in production builds,
 * and nothing when the backend refuses (non-local server or a different account).
 */
export default function DevTeamSwitcher() {
  const [teams, setTeams] = useState<DevTeam[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const teamSlug = useAuthStore((s) => s.user?.team?.slug);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    apiFetch<DevTeam[]>("/dev/teams")
      .then((list) => !cancelled && setTeams(list))
      .catch(() => !cancelled && setTeams(null));
    return () => {
      cancelled = true;
    };
  }, [teamSlug]);

  if (!import.meta.env.DEV || !teams) return null;

  async function change(slug: string) {
    setBusy(true);
    setError("");
    try {
      const profile = await apiFetch<AuthUser>("/dev/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      useAuthStore.setState({ user: profile });
      // Reload so every query, sidebar link and accent colour follows the new team.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch team.");
      setBusy(false);
    }
  }

  return (
    <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      Dev team
      <select
        value={teamSlug ?? ""}
        disabled={busy}
        onChange={(e) => void change(e.target.value)}
        title={error || "Switch team (local only)"}
        className={`rounded-md border bg-white px-2 py-1 text-xs font-medium normal-case tracking-normal text-slate-700 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      >
        {teams.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
