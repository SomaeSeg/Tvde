// Tipos das linhas das tabelas Supabase usadas na app.
import type { ActivityLevel, GoalType, Sex } from './calc';

export interface Profile {
  id: string;
  display_name: string | null;
  sex: Sex | null;
  birth_date: string | null;
  height_cm: number | null;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  goal_rate_kg_week: number;
  equipment: string[];
  water_target_ml: number;
  onboarding_done: boolean;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  visceral_fat: number | null;
  muscle_pct: number | null;
  skeletal_muscle_pct: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  protein_pct: number | null;
  notes: string | null;
}

export type MeasurementSite =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm_left'
  | 'arm_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'calf_left'
  | 'calf_right';

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string;
  site: MeasurementSite;
  value_cm: number;
}

export interface Goal {
  id: string;
  user_id: string;
  metric: 'weight_kg' | 'body_fat_pct' | 'visceral_fat' | 'muscle_pct' | 'waist_cm' | 'resting_hr';
  start_value: number;
  target_value: number;
  target_date: string | null;
  status: 'active' | 'achieved' | 'abandoned';
}

export interface Food {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: 'off' | 'manual' | 'base';
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  fiber_100: number | null;
  sugar_100: number | null;
  salt_100: number | null;
  serving_g: number | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal: MealType;
  food_id: string | null;
  recipe_id: string | null;
  description: string | null;
  quantity_g: number | null;
  servings: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealTemplate {
  id: string;
  user_id: string;
  name: string;
  items: { food_id: string; quantity_g: number }[];
}

export interface NutritionTarget {
  id: string;
  user_id: string;
  effective_from: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  slug: string | null;
  name: string;
  category: 'strength' | 'cardio' | 'mobility' | 'core';
  primary_muscles: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string | null;
  media_url: string | null;
}

export interface WorkoutPlan {
  id: string;
  user_id: string | null;
  slug: string | null;
  name: string;
  description: string | null;
  goal_type: GoalType | null;
  level: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  weeks: number;
}

export interface PlanDay {
  id: string;
  plan_id: string;
  day_index: number;
  name: string;
  focus: string | null;
}

export interface PlanExercise {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  position: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  duration_minutes: number | null;
  notes: string | null;
  exercises?: Exercise;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  date: string;
  plan_day_id: string | null;
  name: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_km: number | null;
  avg_hr: number | null;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  notes: string | null;
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'Peso corporal',
  dumbbell: 'Halteres',
  bench: 'Banco',
  band: 'Elásticos',
  treadmill: 'Passadeira',
  bike: 'Bicicleta',
  pullup_bar: 'Barra de tração',
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Pequeno-almoço',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Snacks',
};

export const SITE_LABELS: Record<MeasurementSite, string> = {
  neck: 'Pescoço',
  shoulders: 'Ombros',
  chest: 'Peito',
  waist: 'Cintura',
  hips: 'Anca',
  arm_left: 'Braço esq.',
  arm_right: 'Braço dir.',
  thigh_left: 'Coxa esq.',
  thigh_right: 'Coxa dir.',
  calf_left: 'Gémeo esq.',
  calf_right: 'Gémeo dir.',
};
