// Motor de cálculos da VitaOS: TMB, alvos calóricos, macros, IMC,
// médias móveis e projeções de metas. Tudo puro e testável.

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose_fat' | 'maintain' | 'gain_muscle' | 'improve_health';

const KCAL_PER_KG_FAT = 7700;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário (pouco ou nenhum exercício)',
  light: 'Leve (1–3 treinos/semana)',
  moderate: 'Moderado (3–5 treinos/semana)',
  active: 'Ativo (6–7 treinos/semana)',
  very_active: 'Muito ativo (trabalho físico + treino)',
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose_fat: 'Perder gordura',
  maintain: 'Manter peso',
  gain_muscle: 'Ganhar músculo',
  improve_health: 'Melhorar saúde geral',
};

export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const birth = new Date(birthDate + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** TMB por Mifflin-St Jeor. */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function tdee(bmrKcal: number, level: ActivityLevel): number {
  return Math.round(bmrKcal * ACTIVITY_FACTORS[level]);
}

/**
 * Alvo calórico diário. Para perder gordura aplica o défice implícito no ritmo
 * (kg/semana); para ganhar músculo aplica um superavit moderado do mesmo ritmo.
 * Nunca desce abaixo de um piso de segurança.
 */
export function calorieTarget(
  tdeeKcal: number,
  goal: GoalType,
  rateKgWeek: number,
  sex: Sex,
): number {
  const dailyDelta = (rateKgWeek * KCAL_PER_KG_FAT) / 7;
  let target = tdeeKcal;
  if (goal === 'lose_fat') target = tdeeKcal - dailyDelta;
  if (goal === 'gain_muscle') target = tdeeKcal + Math.min(dailyDelta, 300);
  const floor = sex === 'male' ? 1500 : 1200;
  return Math.round(Math.max(target, floor));
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Macros: proteína por kg de peso (mais alta em défice/ganho), gordura mínima
 * saudável, resto em hidratos.
 */
export function macroTargets(kcal: number, weightKg: number, goal: GoalType): MacroTargets {
  const proteinPerKg = goal === 'gain_muscle' ? 2.0 : goal === 'lose_fat' ? 1.8 : 1.5;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round(Math.max(weightKg * 0.8, (kcal * 0.2) / 9));
  const carbsKcal = Math.max(kcal - proteinG * 4 - fatG * 9, 0);
  return { kcal, proteinG, carbsG: Math.round(carbsKcal / 4), fatG };
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Abaixo do peso';
  if (value < 25) return 'Peso normal';
  if (value < 30) return 'Excesso de peso';
  if (value < 35) return 'Obesidade grau I';
  if (value < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

/** Rácio cintura/altura — saudável abaixo de 0,5. */
export function waistToHeight(waistCm: number, heightCm: number): number {
  return Math.round((waistCm / heightCm) * 100) / 100;
}

export function waistToHip(waistCm: number, hipCm: number): number {
  return Math.round((waistCm / hipCm) * 100) / 100;
}

export interface DatedValue {
  date: string; // yyyy-mm-dd
  value: number;
}

/**
 * Média móvel de N dias sobre uma série datada (ordenada por data asc).
 * Para cada ponto usa os valores dos últimos `windowDays` dias de calendário.
 */
export function movingAverage(points: DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p, i) => {
    const cutoff = new Date(p.date + 'T00:00:00');
    cutoff.setDate(cutoff.getDate() - (windowDays - 1));
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const window = sorted.slice(0, i + 1).filter((q) => q.date >= cutoffStr);
    const avg = window.reduce((s, q) => s + q.value, 0) / window.length;
    return { date: p.date, value: Math.round(avg * 100) / 100 };
  });
}

/**
 * Tendência linear (kg/dia, por regressão simples) sobre os últimos `days` dias.
 * Devolve null com menos de 2 pontos.
 */
export function trendPerDay(points: DatedValue[], days = 28): number | null {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const last = new Date(sorted[sorted.length - 1].date + 'T00:00:00');
  const cutoff = new Date(last);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const recent = sorted.filter((p) => new Date(p.date + 'T00:00:00') >= cutoff);
  if (recent.length < 2) return null;
  const t0 = new Date(recent[0].date + 'T00:00:00').getTime();
  const xs = recent.map((p) => (new Date(p.date + 'T00:00:00').getTime() - t0) / 86400000);
  const ys = recent.map((p) => p.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) * (xs[i] - mx);
  }
  if (den === 0) return null;
  return num / den;
}

/**
 * Projeta a data em que a meta será atingida ao ritmo atual.
 * Devolve null se não há tendência ou se a tendência afasta da meta.
 */
export function projectGoalDate(points: DatedValue[], targetValue: number): string | null {
  const slope = trendPerDay(points);
  if (slope === null || slope === 0) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const remaining = targetValue - last.value;
  if (remaining === 0) return last.date;
  const daysNeeded = remaining / slope;
  if (daysNeeded < 0 || daysNeeded > 365 * 3) return null; // tendência na direção errada ou irrealista
  const d = new Date(last.date + 'T00:00:00');
  d.setDate(d.getDate() + Math.ceil(daysNeeded));
  return d.toISOString().slice(0, 10);
}

export interface FoodPer100 {
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
}

export interface PortionMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function portionMacros(food: FoodPer100, grams: number): PortionMacros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcal_100 * f * 10) / 10,
    proteinG: Math.round(food.protein_100 * f * 10) / 10,
    carbsG: Math.round(food.carbs_100 * f * 10) / 10,
    fatG: Math.round(food.fat_100 * f * 10) / 10,
  };
}

/**
 * Streak de consistência: dias consecutivos (a terminar hoje ou ontem) em que
 * o utilizador registou pelo menos uma refeição.
 */
export function streak(loggedDates: string[], today: string): number {
  const set = new Set(loggedDates);
  let count = 0;
  const cursor = new Date(today + 'T00:00:00');
  // streak pode terminar hoje ou ontem (o dia de hoje ainda pode vir a ser registado)
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Volume total de uma sessão de força (soma de reps × carga). */
export function sessionVolume(sets: { reps: number | null; weight_kg: number | null }[]): number {
  return sets.reduce((total, s) => total + (s.reps ?? 0) * (s.weight_kg ?? 0), 0);
}

/** Melhor série (estimativa 1RM por Epley) para deteção de PRs. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}
