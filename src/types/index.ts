export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type DietGoal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type UnitPreference = 'metric' | 'imperial';
export type Theme = 'light' | 'dark' | 'system';
export type FoodSource = 'openfoodfacts' | 'edamam' | 'fallback' | 'manual';

export interface Profile {
  id: string;
  name: string;
  email?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  current_weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
  diet_goal: DietGoal;
  dietary_restrictions: string[];
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  water_goal_ml: number;
  unit_preference: UnitPreference;
  theme: Theme;
  target_date?: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_name: string;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size?: string;
  serving_quantity: number;
  source: FoodSource;
  image_url?: string;
  logged_date: string;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_date: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_date: string;
  notes?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_logged_date?: string;
  updated_at: string;
}

export interface NutritionData {
  name?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
  source?: FoodSource;
}

export interface FoodPrediction {
  name: string;
  confidence: number;
}

export interface FoodSearchResult extends NutritionData {
  id?: string;
  brand?: string;
  barcode?: string;
  image_url?: string;
  nutrition_grade?: string;
}

export interface UserContext {
  name: string;
  goal: string;
  current_weight: number;
  target_weight: number;
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  today_calories: number;
  today_protein: number;
  today_carbs: number;
  today_fat: number;
  dietary_restrictions: string[];
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  meals: {
    breakfast: FoodLog[];
    lunch: FoodLog[];
    dinner: FoodLog[];
    snack: FoodLog[];
  };
}

export interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

export interface MealPlan {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meals: {
    breakfast: MealPlanItem;
    lunch: MealPlanItem;
    dinner: MealPlanItem;
    snack?: MealPlanItem;
  };
}

export interface MealPlanItem {
  name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
}
