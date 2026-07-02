'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useNutritionTarget } from '@/lib/hooks';
import { Card, CardTitle, PageHeader, Spinner, Stat } from '@/components/ui';
import { addDays, todayStr } from '@/lib/dates';
import { useActivePlan } from '../treino/home';

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function SemanaPage() {
  const today = todayStr();
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);
  const { data: target } = useNutritionTarget();
  const { data: activePlan } = useActivePlan();

  const { data, isLoading } = useQuery({
    queryKey: ['weekly_review'],
    queryFn: async () => {
      const supabase = createClient();
      const [foodLogs, metrics, sessions, waterLogs, checkins] = await Promise.all([
        supabase.from('food_logs').select('date, kcal, protein_g').gte('date', prevWeekStart),
        supabase.from('body_metrics').select('date, weight_kg').gte('date', prevWeekStart).order('date'),
        supabase.from('workout_sessions').select('date, finished_at').gte('date', weekStart),
        supabase.from('water_logs').select('date, ml').gte('date', weekStart),
        supabase.from('daily_checkins').select('date, sleep_hours, energy').gte('date', weekStart),
      ]);
      return {
        foodLogs: foodLogs.data ?? [],
        metrics: metrics.data ?? [],
        sessions: sessions.data ?? [],
        waterLogs: waterLogs.data ?? [],
        checkins: checkins.data ?? [],
      };
    },
  });

  if (isLoading || !data) return <Spinner />;

  const isThisWeek = (d: string) => d >= weekStart;

  // Peso: média desta semana vs semana anterior
  const weightsThis = data.metrics.filter((m) => isThisWeek(m.date) && m.weight_kg).map((m) => Number(m.weight_kg));
  const weightsPrev = data.metrics.filter((m) => !isThisWeek(m.date) && m.weight_kg).map((m) => Number(m.weight_kg));
  const avgThis = avg(weightsThis);
  const avgPrev = avg(weightsPrev);
  const weightDelta = avgThis !== null && avgPrev !== null ? Math.round((avgThis - avgPrev) * 100) / 100 : null;

  // Calorias: média por dia registado + aderência (dias dentro de ±10% do alvo)
  const kcalByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const l of data.foodLogs.filter((l) => isThisWeek(l.date))) {
    kcalByDay.set(l.date, (kcalByDay.get(l.date) ?? 0) + Number(l.kcal));
    proteinByDay.set(l.date, (proteinByDay.get(l.date) ?? 0) + Number(l.protein_g));
  }
  const loggedDays = kcalByDay.size;
  const avgKcal = avg([...kcalByDay.values()]);
  const avgProtein = avg([...proteinByDay.values()]);
  const daysOnTarget = target
    ? [...kcalByDay.values()].filter((k) => k >= target.kcal * 0.9 && k <= target.kcal * 1.1).length
    : 0;

  // Treinos
  const doneSessions = data.sessions.filter((s) => s.finished_at).length;
  const plannedPerWeek = activePlan?.days.length ?? 0;

  // Água e sono
  const waterByDay = new Map<string, number>();
  for (const w of data.waterLogs) waterByDay.set(w.date, (waterByDay.get(w.date) ?? 0) + w.ml);
  const avgWater = avg([...waterByDay.values()]);
  const avgSleep = avg(data.checkins.filter((c) => c.sleep_hours).map((c) => Number(c.sleep_hours)));
  const avgEnergy = avg(data.checkins.filter((c) => c.energy).map((c) => Number(c.energy)));

  const highlights: string[] = [];
  if (weightDelta !== null) {
    if (weightDelta < -0.1) highlights.push(`Perdeste ${Math.abs(weightDelta)} kg em média vs a semana anterior. 👏`);
    else if (weightDelta > 0.1) highlights.push(`O peso médio subiu ${weightDelta} kg vs a semana anterior.`);
    else highlights.push('Peso estável esta semana.');
  }
  if (plannedPerWeek > 0) {
    highlights.push(
      doneSessions >= plannedPerWeek
        ? `Cumpriste os ${plannedPerWeek} treinos planeados. 💪`
        : `Fizeste ${doneSessions} de ${plannedPerWeek} treinos planeados.`,
    );
  } else if (doneSessions > 0) {
    highlights.push(`Fizeste ${doneSessions} treino${doneSessions > 1 ? 's' : ''} esta semana.`);
  }
  if (loggedDays >= 6) highlights.push(`Registaste refeições em ${loggedDays}/7 dias — consistência excelente.`);
  else if (loggedDays > 0) highlights.push(`Registaste refeições em ${loggedDays}/7 dias. O registo diário é o que faz a diferença.`);

  return (
    <main>
      <PageHeader title="A tua semana" subtitle="Últimos 7 dias vs semana anterior" />

      <div className="space-y-4">
        <Card>
          <ul className="space-y-2 text-sm">
            {highlights.map((h) => (
              <li key={h}>• {h}</li>
            ))}
            {highlights.length === 0 && <li className="text-zinc-400">Ainda não há dados suficientes esta semana.</li>}
          </ul>
        </Card>

        <Card>
          <CardTitle>Peso</CardTitle>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Média 7d" value={avgThis !== null ? `${Math.round(avgThis * 10) / 10} kg` : '—'} />
            <Stat label="Semana anterior" value={avgPrev !== null ? `${Math.round(avgPrev * 10) / 10} kg` : '—'} />
            <Stat
              label="Diferença"
              value={weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${weightDelta} kg` : '—'}
              tone={weightDelta === null ? 'default' : weightDelta < 0 ? 'good' : weightDelta > 0 ? 'warn' : 'default'}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Nutrição</CardTitle>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Média kcal/dia" value={avgKcal !== null ? String(Math.round(avgKcal)) : '—'} sub={target ? `alvo ${target.kcal}` : undefined} />
            <Stat label="Proteína média" value={avgProtein !== null ? `${Math.round(avgProtein)} g` : '—'} sub={target ? `alvo ${target.protein_g} g` : undefined} />
            <Stat label="Dias no alvo" value={`${daysOnTarget}/${loggedDays}`} sub="±10% do alvo" />
          </div>
        </Card>

        <Card>
          <CardTitle>Treino & hábitos</CardTitle>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Treinos" value={`${doneSessions}${plannedPerWeek ? '/' + plannedPerWeek : ''}`} tone={plannedPerWeek > 0 && doneSessions >= plannedPerWeek ? 'good' : 'default'} />
            <Stat label="Água média" value={avgWater !== null ? `${Math.round(avgWater)} ml` : '—'} />
            <Stat label="Sono médio" value={avgSleep !== null ? `${Math.round(avgSleep * 10) / 10} h` : '—'} sub={avgEnergy !== null ? `energia ${Math.round(avgEnergy * 10) / 10}/5` : undefined} />
          </div>
        </Card>
      </div>
    </main>
  );
}
