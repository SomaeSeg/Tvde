// Helpers do módulo de treino: compatibilidade de equipamento e warm-up automático.
import type { Exercise, WorkoutPlan } from './types';

/** Um plano é compatível se todo o equipamento que exige estiver disponível. */
export function planCompatible(plan: WorkoutPlan, available: string[]): boolean {
  const have = new Set([...available, 'bodyweight']);
  return plan.equipment.every((e) => have.has(e));
}

export interface WarmupMove {
  name: string;
  duration: string;
}

/**
 * Gera ~5 min de aquecimento específico para os músculos do treino do dia.
 * Regras simples: cardio leve para elevar a temperatura + mobilidade dirigida.
 */
export function generateWarmup(exercises: Pick<Exercise, 'primary_muscles' | 'category'>[]): WarmupMove[] {
  const muscles = new Set(exercises.flatMap((e) => e.primary_muscles));
  const isCardioDay = exercises.length > 0 && exercises.every((e) => e.category === 'cardio');

  if (isCardioDay) {
    return [
      { name: 'Início muito leve (aumenta o ritmo gradualmente)', duration: '3 min' },
      { name: 'Mobilidade de tornozelos e anca', duration: '1 min' },
      { name: 'Alongamento dinâmico de pernas', duration: '1 min' },
    ];
  }

  const moves: WarmupMove[] = [{ name: 'Polichinelos ou marcha no lugar', duration: '90 s' }];

  const lower = ['quadricep', 'gluteo', 'posterior', 'pernas'].some((m) => muscles.has(m));
  const upperPush = ['peito', 'ombros', 'tricep'].some((m) => muscles.has(m));
  const upperPull = ['costas', 'bicep', 'trapezio'].some((m) => muscles.has(m));
  const core = ['core', 'obliquos', 'lombar'].some((m) => muscles.has(m));

  if (lower) {
    moves.push({ name: 'Agachamentos só com peso corporal', duration: '15 reps' });
    moves.push({ name: 'Afundos dinâmicos alternados', duration: '10 reps' });
  }
  if (upperPush) {
    moves.push({ name: 'Círculos de braços + flexões fáceis (joelhos)', duration: '10 reps' });
  }
  if (upperPull) {
    moves.push({ name: 'Band pull-aparts ou abraços de ombros', duration: '15 reps' });
  }
  if (core || moves.length < 3) {
    moves.push({ name: 'Gato-vaca + rotação torácica', duration: '45 s' });
  }

  return moves.slice(0, 5);
}
