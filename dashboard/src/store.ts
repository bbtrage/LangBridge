import { create } from 'zustand';
import type { TranslationResult } from './services/api';

interface AppState {
  translations: TranslationResult[];
  latencyHistory: { time: string; latency: number }[];
  addTranslation: (result: TranslationResult) => void;
  clearTranslations: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  translations: [],
  latencyHistory: [],

  addTranslation: (result) =>
    set((state) => {
      const translations = [result, ...state.translations].slice(0, 50);
      const latencyHistory = [
        ...state.latencyHistory,
        {
          time: new Date(result.timestamp * 1000).toLocaleTimeString(),
          latency: result.latency_ms,
        },
      ].slice(-30);
      return { translations, latencyHistory };
    }),

  clearTranslations: () => set({ translations: [], latencyHistory: [] }),
}));
