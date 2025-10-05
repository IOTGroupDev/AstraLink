import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlanetPosition {
  longitude: number;
  sign: string;
  degree: number;
  speed?: number;
}

interface HousePosition {
  longitude: number;
  sign: string;
  degree: number;
}

interface NatalChart {
  id: string;
  userId: string;
  data: {
    type: 'natal';
    birthDate: string;
    location: {
      latitude: number;
      longitude: number;
      timezone: number;
    };
    planets: Record<string, PlanetPosition>;
    houses: Record<string, HousePosition>;
    aspects: any[];
    calculatedAt: string;
    interpretation?: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface ChartState {
  natalChart: NatalChart | null;
  currentTransits: any[] | null;
  predictions: any[] | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setNatalChart: (chart: NatalChart | null) => void;
  setTransits: (transits: any[] | null) => void;
  setPredictions: (predictions: any[] | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateNatalChart: (updates: Partial<NatalChart>) => void;
  clearError: () => void;

  // Computed properties
  hasNatalChart: () => boolean;
  getPlanetPosition: (planet: string) => PlanetPosition | null;
  getHousePosition: (house: number) => HousePosition | null;
  getAspects: () => any[];
}

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      natalChart: null,
      currentTransits: null,
      predictions: null,
      isLoading: false,
      error: null,

      setNatalChart: (chart) =>
        set({
          natalChart: chart,
          error: null,
        }),

      setTransits: (transits) =>
        set({
          currentTransits: transits,
        }),

      setPredictions: (predictions) =>
        set({
          predictions,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      updateNatalChart: (updates) => {
        const currentChart = get().natalChart;
        if (currentChart) {
          set({
            natalChart: { ...currentChart, ...updates },
          });
        }
      },

      clearError: () => set({ error: null }),

      hasNatalChart: () => {
        const chart = get().natalChart;
        return !!chart && !!chart.data;
      },

      getPlanetPosition: (planet) => {
        const chart = get().natalChart;
        if (!chart?.data?.planets) return null;
        return chart.data.planets[planet] || null;
      },

      getHousePosition: (house) => {
        const chart = get().natalChart;
        if (!chart?.data?.houses) return null;
        return chart.data.houses[house.toString()] || null;
      },

      getAspects: () => {
        const chart = get().natalChart;
        return chart?.data?.aspects || [];
      },
    }),
    {
      name: 'chart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        natalChart: state.natalChart,
        currentTransits: state.currentTransits,
        predictions: state.predictions,
      }),
    }
  )
);

// Selectors for common chart state
export const useNatalChart = () => useChartStore((state) => state.natalChart);
export const useChartLoading = () => useChartStore((state) => state.isLoading);
export const useChartError = () => useChartStore((state) => state.error);
export const useHasNatalChart = () =>
  useChartStore((state) => state.hasNatalChart);
export const usePlanetPosition = () =>
  useChartStore((state) => state.getPlanetPosition);
export const useHousePosition = () =>
  useChartStore((state) => state.getHousePosition);
export const useChartAspects = () => useChartStore((state) => state.getAspects);
