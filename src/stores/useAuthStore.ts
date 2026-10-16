import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sessionFetch, sessionGeneration, assertSession } from "../lib/session";
import type { UserRole } from "../lib/datasetPermissions";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team?: { id: number; slug: string; name: string; accent_color: string };
  capabilities?: string[];
}

interface AuthState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  clearSession: () => void;
  token: string | null;
  talaToken: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithTala: (data: { token: string; tala_token?: string; user: AuthUser }) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      clearSession: () => set({ token: null, talaToken: null, user: null, hydrated: false }),
      hydrate: async () => {
        const token = get().token;
        if (!token) return;
        const expected = sessionGeneration();
        const response = await sessionFetch(API_BASE + "/auth/me", {
          headers: { Authorization: "Bearer " + token, Accept: "application/json" },
        });
        if (get().token !== token) return;
        if (!response.ok) {
          if ([401, 403].includes(response.status)) get().clearSession();
          throw new Error(
            response.status === 503
              ? "Team verification is unavailable. Please retry."
              : "Your team membership could not be verified.",
          );
        }
        const user = await response.json();
        assertSession(expected);
        if (get().token === token) set({ user, hydrated: true });
      },
      token: null,
      talaToken: null,
      user: null,

      login: async (email: string, password: string) => {
        const expected = sessionGeneration();
        const res = await sessionFetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Login failed.");
        }

        const data = await res.json();
        assertSession(expected);
        set({ token: data.token, talaToken: null, user: data.user, hydrated: true });
      },

      loginWithTala: (data: { token: string; tala_token?: string; user: AuthUser }) => {
        set({
          token: data.token,
          talaToken: data.tala_token ?? null,
          user: data.user,
          hydrated: true,
        });
      },

      logout: async () => {
        const { token } = get();
        get().clearSession();
        if (token) {
          await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }).catch(() => {
            /* ignore network errors on logout */
          });
        }
      },

      isAuthenticated: () => Boolean(get().token && get().user),
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "commsdash-auth",
      partialize: (state) => ({ token: state.token, talaToken: state.talaToken, user: state.user }),
    },
  ),
);
