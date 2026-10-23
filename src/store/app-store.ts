"use client";

import { create } from "zustand";
import type { User } from "@/types/solar";
import { api } from "@/lib/api-client";

export type AppView =
  | "landing"
  | "auth"
  | "overview"
  | "assessment"
  | "results"
  | "advisor"
  | "simulator"
  | "history"
  | "profile"
  | "admin"
  | "plans"
  | "notfound";

interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;
  authChecked: boolean;

  // Navigation
  view: AppView;
  currentAssessmentId: string | null;

  // Actions
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  navigate: (view: AppView, assessmentId?: string | null) => void;
  goAuth: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  authLoading: false,
  authChecked: false,
  view: "landing",
  currentAssessmentId: null,

  refreshUser: async () => {
    try {
      const data = await api.get<{ user: User | null }>("/api/auth/me");
      set({ user: data.user, authChecked: true });
    } catch {
      set({ user: null, authChecked: true });
    }
  },

  login: async (email, password) => {
    set({ authLoading: true });
    try {
      const data = await api.post<{ user: User }>("/api/auth/login", { email, password });
      set({ user: data.user, authLoading: false, view: "overview" });
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  register: async (name, email, password) => {
    set({ authLoading: true });
    try {
      const data = await api.post<{ user: User }>("/api/auth/register", { name, email, password });
      set({ user: data.user, authLoading: false, view: "overview" });
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ignore */
    }
    set({ user: null, view: "landing", currentAssessmentId: null });
  },

  navigate: (view, assessmentId = null) => {
    set({ view, currentAssessmentId: assessmentId ?? get().currentAssessmentId });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },

  goAuth: () => set({ view: "auth" }),
}));
