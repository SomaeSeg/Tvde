'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate } from '@/lib/hooks';
import { Button, Card, CardTitle, Input, ProgressBar, Select } from '@/components/ui';
import { projectGoalDate } from '@/lib/calc';
import { formatDatePt } from '@/lib/dates';
import type { BodyMeasurement, BodyMetric, Goal } from '@/lib/types';
import { useBodyMetrics } from './metric-chart';

const GOAL_METRICS: Record<Goal['metric'], { label: string; suffix: string }> = {
  weight_kg: { label: 'Peso', suffix: 'kg' },
  body_fat_pct: { label: 'Gordura corporal', suffix: '%' },
  visceral_fat: { label: 'Gordura visceral', suffix: '' },
  muscle_pct: { label: 'Massa muscular', suffix: '%' },
  waist_cm: { label: 'Cintura', suffix: 'cm' },
  resting_hr: { label: 'FC de repouso', suffix: 'bpm' },
};

export function Goals() {
  const invalidate = useInvalidate();
  const { data: metrics } = useBodyMetrics();
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState<Goal['metric']>('weight_kg');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<Goal[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Goal[];
    },
  });

  const { data: waistPoints } = useQuery({
    queryKey: ['waist_series'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('site', 'waist')
        .order('date', { ascending: true });
      if (error) throw error;
      return (data as BodyMeasurement[]).map((m) => ({ date: m.date, value: Number(m.value_cm) }));
    },
  });

  function seriesFor(m: Goal['metric']) {
    if (m === 'waist_cm') return waistPoints ?? [];
    return (metrics ?? [])
      .filter((row: BodyMetric) => row[m as keyof BodyMetric] !== null)
      .map((row: BodyMetric) => ({ date: row.date, value: Number(row[m as keyof BodyMetric]) }));
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const series = seriesFor(metric);
    const startValue = series.at(-1)?.value ?? Number(target);
    await supabase.from('goals').insert({
      user_id: user.id,
      metric,
      start_value: startValue,
      target_value: Number(target),
      target_date: targetDate || null,
    });
    setShowForm(false);
    setTarget('');
    setTargetDate('');
    setSaving(false);
    invalidate('goals');
  }

  async function markDone(goal: Goal, status: 'achieved' | 'abandoned') {
    const supabase = createClient();
    await supabase.from('goals').update({ status }).eq('id', goal.id);
    invalidate('goals');
  }

  return (
    <Card>
      <CardTitle
        action={
          <button
            type="button"
            className="text-xs font-medium text-emerald-600 hover:underline"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : '+ Nova meta'}
          </button>
        }
      >
        Metas
      </CardTitle>

      {showForm && (
        <form onSubmit={addGoal} className="mb-4 space-y-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <Select id="gmetric" label="Métrica" value={metric} onChange={(e) => setMetric(e.target.value as Goal['metric'])}>
            {Object.entries(GOAL_METRICS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="gtarget"
              label="Valor alvo"
              type="number"
              inputMode="decimal"
              step="0.1"
              required
              suffix={GOAL_METRICS[metric].suffix}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <Input
              id="gdate"
              label="Data alvo (opcional)"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={saving || target === ''}>
            Criar meta
          </Button>
        </form>
      )}

      {(goals ?? []).length === 0 && !showForm ? (
        <p className="text-sm text-zinc-400">
          Define uma meta concreta — ex.: “cintura −10 cm” ou “gordura visceral de 17 para 12”.
        </p>
      ) : (
        <div className="space-y-4">
          {(goals ?? []).map((g) => {
            const series = seriesFor(g.metric);
            const current = series.at(-1)?.value ?? g.start_value;
            const total = Math.abs(g.target_value - g.start_value);
            const done = Math.min(Math.abs(current - g.start_value), total);
            const rightDirection =
              Math.sign(current - g.start_value) === Math.sign(g.target_value - g.start_value) || current === g.start_value;
            const projected = projectGoalDate(series, Number(g.target_value));
            const meta = GOAL_METRICS[g.metric];
            const achieved =
              g.target_value < g.start_value ? current <= g.target_value : current >= g.target_value;
            return (
              <div key={g.id}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">
                    {meta.label}: {Number(g.start_value)} → {Number(g.target_value)} {meta.suffix}
                  </span>
                  <span className="text-xs text-zinc-500">
                    agora {current} {meta.suffix}
                  </span>
                </div>
                <ProgressBar value={rightDirection ? done : 0} max={total} />
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {achieved
                      ? '🎉 Meta atingida!'
                      : projected
                        ? `Ao ritmo atual: ~${formatDatePt(projected)}`
                        : g.target_date
                          ? `Data alvo: ${formatDatePt(g.target_date)}`
                          : ''}
                  </span>
                  <span className="flex gap-2">
                    {achieved && (
                      <button className="font-medium text-emerald-600" onClick={() => markDone(g, 'achieved')}>
                        Concluir
                      </button>
                    )}
                    <button className="text-zinc-400 hover:text-red-500" onClick={() => markDone(g, 'abandoned')}>
                      Remover
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
