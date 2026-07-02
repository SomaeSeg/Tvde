'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate, useNutritionTarget, useProfile } from '@/lib/hooks';
import { Button, Card, CardTitle, PageHeader, ProgressBar, Spinner } from '@/components/ui';
import { MEAL_LABELS, type FoodLog, type MealTemplate, type MealType } from '@/lib/types';
import { addDays, formatDatePt, todayStr } from '@/lib/dates';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function useFoodLogs(date: string) {
  return useQuery({
    queryKey: ['food_logs', date],
    queryFn: async (): Promise<FoodLog[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FoodLog[];
    },
  });
}

export function NutritionDay() {
  const invalidate = useInvalidate();
  const [date, setDate] = useState(todayStr());
  const { data: logs, isLoading } = useFoodLogs(date);
  const { data: target } = useNutritionTarget();
  const { data: profile } = useProfile();

  const { data: water } = useQuery({
    queryKey: ['water_logs', date],
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('water_logs').select('ml').eq('date', date);
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + r.ml, 0);
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['meal_templates'],
    queryFn: async (): Promise<MealTemplate[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('meal_templates').select('*').order('name');
      if (error) throw error;
      return data as MealTemplate[];
    },
  });

  const totals = (logs ?? []).reduce(
    (acc, l) => ({
      kcal: acc.kcal + Number(l.kcal),
      protein: acc.protein + Number(l.protein_g),
      carbs: acc.carbs + Number(l.carbs_g),
      fat: acc.fat + Number(l.fat_g),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  async function addWater(ml: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('water_logs').insert({ user_id: user.id, date, ml });
    invalidate('water_logs');
  }

  async function removeLog(id: string) {
    const supabase = createClient();
    await supabase.from('food_logs').delete().eq('id', id);
    invalidate('food_logs');
  }

  async function saveMealAsTemplate(meal: MealType) {
    const items = (logs ?? [])
      .filter((l) => l.meal === meal && l.food_id && l.quantity_g)
      .map((l) => ({ food_id: l.food_id!, quantity_g: Number(l.quantity_g) }));
    if (items.length === 0) return;
    const name = window.prompt('Nome da refeição típica (ex.: "A minha sopa + sandes"):');
    if (!name) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('meal_templates').insert({ user_id: user.id, name, items });
    invalidate('meal_templates');
  }

  async function addTemplate(template: MealTemplate, meal: MealType) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const ids = template.items.map((i) => i.food_id);
    const { data: foods } = await supabase.from('foods').select('*').in('id', ids);
    if (!foods) return;
    const rows = template.items.flatMap((item) => {
      const food = foods.find((f) => f.id === item.food_id);
      if (!food) return [];
      const f = item.quantity_g / 100;
      return [
        {
          user_id: user.id,
          date,
          meal,
          food_id: food.id,
          description: food.name,
          quantity_g: item.quantity_g,
          kcal: Math.round(food.kcal_100 * f * 10) / 10,
          protein_g: Math.round(food.protein_100 * f * 10) / 10,
          carbs_g: Math.round(food.carbs_100 * f * 10) / 10,
          fat_g: Math.round(food.fat_100 * f * 10) / 10,
        },
      ];
    });
    if (rows.length > 0) await supabase.from('food_logs').insert(rows);
    invalidate('food_logs');
  }

  async function removeTemplate(id: string) {
    const supabase = createClient();
    await supabase.from('meal_templates').delete().eq('id', id);
    invalidate('meal_templates');
  }

  const kcalTarget = target?.kcal ?? 0;
  const waterTarget = profile?.water_target_ml ?? 2000;

  return (
    <main>
      <PageHeader
        title="Nutrição"
        action={
          <div className="flex items-center gap-1 text-sm">
            <button className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setDate(addDays(date, -1))}>
              ←
            </button>
            <span className="min-w-16 text-center font-medium">
              {date === todayStr() ? 'Hoje' : formatDatePt(date)}
            </span>
            <button
              className="rounded-lg px-2 py-1 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              disabled={date >= todayStr()}
              onClick={() => setDate(addDays(date, 1))}
            >
              →
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {Math.round(totals.kcal)}
              <span className="text-sm font-normal text-zinc-500"> / {kcalTarget || '—'} kcal</span>
            </span>
            {kcalTarget > 0 && (
              <span className={`text-sm font-medium ${totals.kcal > kcalTarget ? 'text-red-500' : 'text-emerald-600'}`}>
                {totals.kcal > kcalTarget
                  ? `+${Math.round(totals.kcal - kcalTarget)} acima`
                  : `${Math.round(kcalTarget - totals.kcal)} restantes`}
              </span>
            )}
          </div>
          <ProgressBar value={totals.kcal} max={kcalTarget} />
          {target && (
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              {(
                [
                  ['Proteína', totals.protein, target.protein_g, 'emerald'],
                  ['Hidratos', totals.carbs, target.carbs_g, 'sky'],
                  ['Gordura', totals.fat, target.fat_g, 'amber'],
                ] as const
              ).map(([label, val, max, tone]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-zinc-500">{label}</span>
                    <span className="font-medium">
                      {Math.round(val)}/{max} g
                    </span>
                  </div>
                  <ProgressBar value={val} max={max} tone={tone} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {isLoading ? (
          <Spinner />
        ) : (
          MEALS.map((meal) => {
            const items = (logs ?? []).filter((l) => l.meal === meal);
            const mealKcal = items.reduce((s, l) => s + Number(l.kcal), 0);
            return (
              <Card key={meal}>
                <CardTitle
                  action={
                    <div className="flex items-center gap-3">
                      {items.length > 0 && (
                        <>
                          <span className="text-xs text-zinc-400">{Math.round(mealKcal)} kcal</span>
                          <button
                            title="Guardar como refeição típica"
                            className="text-xs text-zinc-400 hover:text-emerald-600"
                            onClick={() => saveMealAsTemplate(meal)}
                          >
                            💾
                          </button>
                        </>
                      )}
                      <Link
                        href={`/nutricao/adicionar?meal=${meal}&date=${date}`}
                        className="text-xs font-medium text-emerald-600 hover:underline"
                      >
                        + Adicionar
                      </Link>
                    </div>
                  }
                >
                  {MEAL_LABELS[meal]}
                </CardTitle>
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nada registado.</p>
                ) : (
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {items.map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <div className="font-medium">{l.description ?? 'Alimento'}</div>
                          <div className="text-xs text-zinc-400">
                            {l.quantity_g ? `${Number(l.quantity_g)} g · ` : ''}
                            P {Math.round(Number(l.protein_g))} · H {Math.round(Number(l.carbs_g))} · G{' '}
                            {Math.round(Number(l.fat_g))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{Math.round(Number(l.kcal))}</span>
                          <button className="px-1 text-zinc-300 hover:text-red-500" onClick={() => removeLog(l.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}

        {(templates ?? []).length > 0 && (
          <Card>
            <CardTitle>Refeições típicas</CardTitle>
            <div className="space-y-2">
              {(templates ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <div className="flex items-center gap-1">
                    {MEALS.map((m) => (
                      <button
                        key={m}
                        title={`Adicionar ao ${MEAL_LABELS[m].toLowerCase()}`}
                        className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-emerald-900"
                        onClick={() => addTemplate(t, m)}
                      >
                        {MEAL_LABELS[m][0]}
                      </button>
                    ))}
                    <button className="px-1 text-zinc-300 hover:text-red-500" onClick={() => removeTemplate(t.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">P = pequeno-almoço, A = almoço, J = jantar, S = snacks</p>
          </Card>
        )}

        <Card>
          <CardTitle>Hidratação</CardTitle>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xl font-bold">
              {water ?? 0} <span className="text-sm font-normal text-zinc-500">/ {waterTarget} ml</span>
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => addWater(250)}>
                +250
              </Button>
              <Button size="sm" variant="secondary" onClick={() => addWater(500)}>
                +500
              </Button>
            </div>
          </div>
          <ProgressBar value={water ?? 0} max={waterTarget} tone="sky" />
        </Card>
      </div>
    </main>
  );
}
