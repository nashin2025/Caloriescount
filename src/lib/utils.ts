import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCalories(calories: number): string {
  if (calories >= 1000) {
    return `${(calories / 1000).toFixed(1)}k`;
  }
  return calories.toString();
}

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

export function calculateMacros(
  calories: number,
  goal: 'lose' | 'maintain' | 'gain',
  weight: number
): { protein: number; carbs: number; fat: number } {
  let proteinMultiplier: number;
  let fatPercentage: number;

  switch (goal) {
    case 'lose':
      proteinMultiplier = 2.0;
      fatPercentage = 0.25;
      break;
    case 'gain':
      proteinMultiplier = 1.8;
      fatPercentage = 0.30;
      break;
    default:
      proteinMultiplier = 1.6;
      fatPercentage = 0.30;
  }

  const protein = Math.round(weight * proteinMultiplier);
  const fat = Math.round((calories * fatPercentage) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    protein: Math.max(protein, 50),
    carbs: Math.max(carbs, 20),
    fat: Math.max(fat, 20),
  };
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function getDaysUntil(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export function getMealTypeLabel(mealType: string): string {
  const labels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
  return labels[mealType] || mealType;
}

export function getMealTypeIcon(mealType: string): string {
  const icons: Record<string, string> = {
    breakfast: '☀️',
    lunch: '🌤️',
    dinner: '🌙',
    snack: '🍿',
  };
  return icons[mealType] || '🍽️';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
