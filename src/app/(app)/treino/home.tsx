'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate, useProfile } from '@/lib/hooks';
import { Button, Card, CardTitle, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { planCompatible } from '@/lib/workout';
import { EQUIPMENT_LABELS, type PlanDay, type WorkoutPlan, type WorkoutSession } from '@/lib/types';
import { WEEKDAY_LABELS, formatDatePt, todayStr, weekdayIndex } from '@/lib/dates';

export function useActivePlan() {
  return useQuery({
    queryKey: ['active_plan'],
    queryFn: async (): Promise<{ plan: WorkoutPlan; days: PlanDay[] } | null> => {
      const supabase = createClient();
      const { data: active } = await supabase.from('user_active_plans').select('plan_id').maybeSingle();
      if (!active) return null;
      const [{ data: plan }, { data: days }] = await Promise.all([
        supabase.from('workout_plans').select('*').eq('id', active.plan_id).single(),
        supabase.from('plan_days').select('*').eq('plan_id', active.plan_id).order('day_index'),
      ]);
      if (!plan) return null;
      return { plan: plan as WorkoutPlan, days: (days ?? []) as PlanDay[] };
    },
  });
}

export function TreinoHome() {
  const invalidate = useInvalidate();
  const { data: profile } = useProfile();
  const { data: active, isLoading } = useActivePlan();

  const { data: plans } = useQuery({
    queryKey: ['workout_plans'],
    queryFn: async (): Promise<WorkoutPlan[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('workout_plans').select('*').order('name');
      if (error) throw error;
      return data as WorkoutPlan[];
    },
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['workout_sessions'],
    queryFn: async (): Promise<WorkoutSession[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as WorkoutSession[];
    },
  });

  async function activatePlan(planId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_active_plans').upsert({ user_id: user.id, plan_id: planId, started_on: todayStr() });
    invalidate('active_plan');
  }

  async function deactivatePlan() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_active_plans').delete().eq('user_id', user.id);
    invalidate('active_plan');
  }

  if (isLoading) return <Spinner />;

  const todayIdx = weekdayIndex(todayStr());
  const todayDay = active?.days.find((d) => d.day_index === todayIdx);
  const compatible = (plans ?? []).filter((p) => planCompatible(p, profile?.equipment ?? []));
  const others = (plans ?? []).filter((p) => !planCompatible(p, profile?.equipment ?? []));

  return (
    <main>
      <PageHeader
        title="Treino"
        action={
          <Link href="/treino/exercicios" className="text-sm font-medium text-emerald-600 hover:underline">
            Biblioteca
          </Link>
        }
      />

      <div className="space-y-4">
        {active ? (
          <Card>
            <CardTitle
              action={
                <button className="text-xs text-zinc-400 hover:text-red-500" onClick={deactivatePlan}>
                  Mudar de plano
                </button>
              }
            >
              Plano ativo
            </CardTitle>
            <div className="mb-3 font-semibold">{active.plan.name}</div>
            <div className="mb-4 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label, i) => {
                const day = active.days.find((d) => d.day_index === i);
                const isToday = i === todayIdx;
                return (
                  <div
                    key={label}
                    className={`rounded-xl p-1.5 text-center ${
                      isToday ? 'bg-emerald-600 text-white' : day ? 'bg-zinc-100 dark:bg-zinc-800' : 'opacity-40'
                    }`}
                  >
                    <div className="text-[10px] font-medium">{label}</div>
                    <div className="mt-0.5 text-xs" title={day?.name}>
                      {day ? (day.focus === 'cardio' ? '🏃' : '🏋️') : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
            {todayDay ? (
              <Link href={`/treino/sessao?plan_day=${todayDay.id}`}>
                <Button className="w-full">Começar: {todayDay.name}</Button>
              </Link>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm text-zinc-400">Hoje é dia de descanso 😌</p>
                <Link href="/treino/sessao">
                  <Button variant="secondary" className="w-full">
                    Treino livre mesmo assim
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <>
            <Card>
              <CardTitle>Escolhe um plano</CardTitle>
              <p className="mb-3 text-sm text-zinc-500">
                Planos compatíveis com o teu equipamento:{' '}
                {(profile?.equipment ?? []).map((e) => EQUIPMENT_LABELS[e] ?? e).join(', ') || '—'}
              </p>
              <div className="space-y-3">
                {compatible.map((p) => (
                  <PlanCard key={p.id} plan={p} onActivate={() => activatePlan(p.id)} />
                ))}
                {compatible.length === 0 && (
                  <EmptyState title="Nenhum plano compatível" hint="Adiciona equipamento no Perfil." />
                )}
              </div>
            </Card>
            {others.length > 0 && (
              <Card>
                <CardTitle>Outros planos (falta-te equipamento)</CardTitle>
                <div className="space-y-3 opacity-60">
                  {others.map((p) => (
                    <PlanCard key={p.id} plan={p} />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {active && (
          <Link href="/treino/sessao" className="block">
            <Button variant="secondary" className="w-full">
              + Treino livre (fora do plano)
            </Button>
          </Link>
        )}

        <Card>
          <CardTitle>Últimas sessões</CardTitle>
          {(recentSessions ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">Ainda não registaste treinos.</p>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {(recentSessions ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-zinc-400">
                    {formatDatePt(s.date)}
                    {s.finished_at ? ' · ✓' : ' · em curso'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function PlanCard({ plan, onActivate }: { plan: WorkoutPlan; onActivate?: () => void }) {
  return (
    <div className="rounded-xl border border-black/8 p-3 dark:border-white/10">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{plan.name}</div>
          <p className="mt-0.5 text-xs text-zinc-500">{plan.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {plan.equipment.map((e) => (
              <span key={e} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium dark:bg-zinc-800">
                {EQUIPMENT_LABELS[e] ?? e}
              </span>
            ))}
          </div>
        </div>
        {onActivate && (
          <Button size="sm" onClick={onActivate}>
            Ativar
          </Button>
        )}
      </div>
    </div>
  );
}
