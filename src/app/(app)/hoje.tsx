'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate, useNutritionTarget, useProfile } from '@/lib/hooks';
import { Button, Card, CardTitle, PageHeader, ProgressBar, Stat } from '@/components/ui';
import { movingAverage, streak as calcStreak, trendPerDay } from '@/lib/calc';
import { todayStr, weekdayIndex } from '@/lib/dates';
import type { BodyMetric, DailyCheckin, FoodLog } from '@/lib/types';
import { useActivePlan } from './treino/home';

export function Hoje() {
  const invalidate = useInvalidate();
  const today = todayStr();
  const { data: profile } = useProfile();
  const { data: target } = useNutritionTarget();
  const { data: activePlan } = useActivePlan();

  const { data: metrics } = useQuery({
    queryKey: ['body_metrics'],
    queryFn: async (): Promise<BodyMetric[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('body_metrics').select('*').order('date');
      if (error) throw error;
      return data as BodyMetric[];
    },
  });

  const { data: todayLogs } = useQuery({
    queryKey: ['food_logs', today],
    queryFn: async (): Promise<FoodLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('food_logs').select('*').eq('date', today);
      if (error) throw error;
      return data as FoodLog[];
    },
  });

  const { data: logDates } = useQuery({
    queryKey: ['food_log_dates'],
    queryFn: async (): Promise<string[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('food_logs')
        .select('date')
        .order('date', { ascending: false })
        .limit(400);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => r.date as string))];
    },
  });

  const { data: water } = useQuery({
    queryKey: ['water_logs', today],
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('water_logs').select('ml').eq('date', today);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + r.ml, 0);
    },
  });

  const { data: checkin } = useQuery({
    queryKey: ['daily_checkin', today],
    queryFn: async (): Promise<DailyCheckin | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('date', today)
        .maybeSingle();
      if (error) throw error;
      return data as DailyCheckin | null;
    },
  });

  const { data: todaySessions } = useQuery({
    queryKey: ['sessions_week', today],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, date, name, finished_at')
        .eq('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Peso: atual vs média 7d + estagnação
  const weightPoints = (metrics ?? [])
    .filter((m) => m.weight_kg !== null)
    .map((m) => ({ date: m.date, value: Number(m.weight_kg) }));
  const lastWeight = weightPoints.at(-1);
  const avg7 = movingAverage(weightPoints, 7).at(-1)?.value ?? null;
  const trend14 = trendPerDay(weightPoints, 14);
  const stagnant =
    profile?.goal_type === 'lose_fat' &&
    weightPoints.length >= 8 &&
    trend14 !== null &&
    Math.abs(trend14 * 7) < 0.1;

  const totals = (todayLogs ?? []).reduce(
    (acc, l) => ({ kcal: acc.kcal + Number(l.kcal), protein: acc.protein + Number(l.protein_g) }),
    { kcal: 0, protein: 0 },
  );
  const proteinLeft = target ? Math.max(0, target.protein_g - Math.round(totals.protein)) : 0;

  const streakDays = calcStreak(logDates ?? [], today);
  const todayIdx = weekdayIndex(today);
  const todayPlanDay = activePlan?.days.find((d) => d.day_index === todayIdx);
  const workoutDone = (todaySessions ?? []).some((s) => s.finished_at);

  async function addWater(ml: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('water_logs').insert({ user_id: user.id, date: today, ml });
    invalidate('water_logs');
  }

  async function saveCheckin(field: 'mood' | 'energy', value: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('daily_checkins')
      .upsert({ user_id: user.id, date: today, [field]: value }, { onConflict: 'user_id,date' });
    invalidate('daily_checkin');
  }

  async function saveSleep(hours: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('daily_checkins')
      .upsert({ user_id: user.id, date: today, sleep_hours: hours }, { onConflict: 'user_id,date' });
    invalidate('daily_checkin');
  }

  const alerts: { text: string; tone: 'warn' | 'info' }[] = [];
  if (target && proteinLeft > 0 && totals.kcal > target.kcal * 0.6) {
    alerts.push({ text: `Faltam ${proteinLeft} g de proteína e já vais em ${Math.round((totals.kcal / target.kcal) * 100)}% das calorias — prioriza proteína magra.`, tone: 'warn' });
  }
  if (stagnant) {
    alerts.push({ text: 'O peso está estagnado há 2 semanas. Considera recalcular o alvo no Perfil ou rever o registo das refeições.', tone: 'info' });
  }

  return (
    <main>
      <PageHeader
        title={`Olá${profile?.display_name ? ', ' + profile.display_name : ''} 👋`}
        subtitle={new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
        action={
          streakDays > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              🔥 {streakDays}
            </span>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {alerts.map((a) => (
          <div
            key={a.text}
            className={`rounded-2xl border p-3 text-sm ${
              a.tone === 'warn'
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300'
            }`}
          >
            {a.text}
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <Link href="/corpo">
            <Card className="h-full">
              <Stat
                label="Peso (média 7d)"
                value={avg7 !== null ? `${avg7} kg` : '—'}
                sub={lastWeight ? `hoje: ${lastWeight.value} kg` : 'sem registo hoje'}
              />
            </Card>
          </Link>
          <Link href="/nutricao">
            <Card className="h-full">
              <Stat
                label="Calorias"
                value={`${Math.round(totals.kcal)}`}
                sub={target ? `de ${target.kcal} kcal` : 'sem alvo definido'}
                tone={target && totals.kcal > target.kcal ? 'bad' : 'default'}
              />
              <div className="mt-2">
                <ProgressBar value={totals.kcal} max={target?.kcal ?? 0} />
              </div>
            </Card>
          </Link>
        </div>

        <Card>
          <CardTitle>Proteína</CardTitle>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold">
              {Math.round(totals.protein)} <span className="text-sm font-normal text-zinc-500">/ {target?.protein_g ?? '—'} g</span>
            </span>
            {proteinLeft > 0 && <span className="text-sm text-zinc-500">faltam {proteinLeft} g</span>}
          </div>
          <div className="mt-2">
            <ProgressBar value={totals.protein} max={target?.protein_g ?? 0} />
          </div>
        </Card>

        <Card>
          <CardTitle>Treino de hoje</CardTitle>
          {workoutDone ? (
            <p className="text-sm font-medium text-emerald-600">✓ Treino concluído. Boa! 💪</p>
          ) : todayPlanDay ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{todayPlanDay.name}</span>
              <Link href={`/treino/sessao?plan_day=${todayPlanDay.id}`}>
                <Button size="sm">Começar</Button>
              </Link>
            </div>
          ) : activePlan ? (
            <p className="text-sm text-zinc-400">Dia de descanso 😌</p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-400">Ainda não tens plano ativo.</span>
              <Link href="/treino">
                <Button size="sm" variant="secondary">
                  Escolher
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => addWater(250)}>
                  +250
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addWater(500)}>
                  +500
                </Button>
              </div>
            }
          >
            Hidratação
          </CardTitle>
          <ProgressBar value={water ?? 0} max={profile?.water_target_ml ?? 2000} tone="sky" />
          <p className="mt-1 text-xs text-zinc-400">
            {water ?? 0} / {profile?.water_target_ml ?? 2000} ml
          </p>
        </Card>

        <Card>
          <CardTitle>Check-in de hoje</CardTitle>
          <div className="space-y-3 text-sm">
            <CheckRow
              label="Humor"
              icons={['😞', '🙁', '😐', '🙂', '😄']}
              value={checkin?.mood ?? null}
              onSelect={(v) => saveCheckin('mood', v)}
            />
            <CheckRow
              label="Energia"
              icons={['🪫', '😴', '😐', '⚡', '🚀']}
              value={checkin?.energy ?? null}
              onSelect={(v) => saveCheckin('energy', v)}
            />
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Sono</span>
              <div className="flex gap-1">
                {[5, 6, 7, 8, 9].map((h) => (
                  <button
                    key={h}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      Number(checkin?.sleep_hours) === h
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                    }`}
                    onClick={() => saveSleep(h)}
                  >
                    {h}h{h === 9 ? '+' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Link href="/semana" className="block">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">A tua semana 📊</div>
                <p className="text-xs text-zinc-400">Revisão semanal: peso, calorias, treinos e consistência.</p>
              </div>
              <span className="text-zinc-300">→</span>
            </div>
          </Card>
        </Link>
      </div>
    </main>
  );
}

function CheckRow({
  label,
  icons,
  value,
  onSelect,
}: {
  label: string;
  icons: string[];
  value: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <div className="flex gap-1">
        {icons.map((icon, i) => (
          <button
            key={icon}
            className={`rounded-lg px-1.5 py-1 text-lg leading-none transition-transform ${
              value === i + 1 ? 'scale-125 rounded-xl bg-emerald-100 dark:bg-emerald-900' : 'opacity-50 hover:opacity-100'
            }`}
            onClick={() => onSelect(i + 1)}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
