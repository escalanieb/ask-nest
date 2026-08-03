import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "viewer";
}

interface AuthState {
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
      token: null,
      talaToken: null,
      user: null,

      login: async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
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
        set({ token: data.token, talaToken: null, user: data.user });
      },

      loginWithTala: (data: { token: string; tala_token?: string; user: AuthUser }) => {
        set({ token: data.token, talaToken: data.tala_token ?? null, user: data.user });
      },

      logout: async () => {
        const { token } = get();
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
        set({ token: null, talaToken: null, user: null });
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
