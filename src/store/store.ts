import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, FoodLog, DailySummary } from '@/types';

interface AppState {
  profile: Profile | null;
  todaySummary: DailySummary | null;
  todayWater: number;
  selectedDate: string;
  isLoading: boolean;
  
  setProfile: (profile: Profile | null) => void;
  setTodaySummary: (summary: DailySummary | null) => void;
  addFoodLog: (log: FoodLog) => void;
  removeFoodLog: (logId: string) => void;
  setTodayWater: (amount: number) => void;
  addWater: (amount: number) => void;
  setSelectedDate: (date: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  profile: null,
  todaySummary: null,
  todayWater: 0,
  selectedDate: new Date().toISOString().split('T')[0],
  isLoading: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setProfile: (profile) => set({ profile }),

      setTodaySummary: (summary) => set({ todaySummary: summary }),

      addFoodLog: (log) => {
        const { todaySummary } = get();
        if (!todaySummary) return;

        const meals = { ...todaySummary.meals };
        meals[log.meal_type] = [...meals[log.meal_type], log];

        set({
          todaySummary: {
            ...todaySummary,
            total_calories: todaySummary.total_calories + log.calories,
            total_protein_g: todaySummary.total_protein_g + log.protein_g,
            total_carbs_g: todaySummary.total_carbs_g + log.carbs_g,
            total_fat_g: todaySummary.total_fat_g + log.fat_g,
            total_fiber_g: todaySummary.total_fiber_g + log.fiber_g,
            meals,
          },
        });
      },

      removeFoodLog: (logId) => {
        const { todaySummary } = get();
        if (!todaySummary) return;

        let removedLog: FoodLog | undefined;
        const meals = { ...todaySummary.meals };

        for (const mealType of Object.keys(meals) as Array<keyof typeof meals>) {
          const index = meals[mealType].findIndex((log) => log.id === logId);
          if (index !== -1) {
            removedLog = meals[mealType][index];
            meals[mealType] = meals[mealType].filter((_, i) => i !== index);
            break;
          }
        }

        if (removedLog) {
          set({
            todaySummary: {
              ...todaySummary,
              total_calories: todaySummary.total_calories - removedLog.calories,
              total_protein_g: todaySummary.total_protein_g - removedLog.protein_g,
              total_carbs_g: todaySummary.total_carbs_g - removedLog.carbs_g,
              total_fat_g: todaySummary.total_fat_g - removedLog.fat_g,
              total_fiber_g: todaySummary.total_fiber_g - removedLog.fiber_g,
              meals,
            },
          });
        }
      },

      setTodayWater: (amount) => set({ todayWater: amount }),

      addWater: (amount) => {
        const { todayWater, profile } = get();
        const newAmount = todayWater + amount;
        const maxAmount = profile?.water_goal_ml || 2000;
        set({ todayWater: Math.min(newAmount, maxAmount) });
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => set(initialState),
    }),
    {
      name: 'caloriescount-storage',
      partialize: (state) => ({
        profile: state.profile,
        todayWater: state.todayWater,
        selectedDate: state.selectedDate,
      }),
    }
  )
);
