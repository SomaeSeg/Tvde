'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate } from '@/lib/hooks';
import { Button, Card, CardTitle, Input, PageHeader, Spinner } from '@/components/ui';
import { epley1RM, sessionVolume } from '@/lib/calc';
import { generateWarmup } from '@/lib/workout';
import type { Exercise, PlanDay, PlanExercise } from '@/lib/types';
import { todayStr } from '@/lib/dates';

interface LoggedSet {
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_km?: number;
  avg_hr?: number;
}

interface SessionExercise {
  exercise: Exercise;
  prescription?: PlanExercise;
  sets: LoggedSet[];
}

function SessaoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const invalidate = useInvalidate();
  const planDayId = params.get('plan_day');

  const [items, setItems] = useState<SessionExercise[]>([]);
  const [dayName, setDayName] = useState('Treino livre');
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [summary, setSummary] = useState<{ volume: number; prs: string[] } | null>(null);
  const [search, setSearch] = useState('');
  const startedAt = useRef(new Date().toISOString());

  const { data: planData, isLoading } = useQuery({
    queryKey: ['plan_day', planDayId],
    enabled: !!planDayId,
    queryFn: async () => {
      const supabase = createClient();
      const [{ data: day }, { data: pex }] = await Promise.all([
        supabase.from('plan_days').select('*').eq('id', planDayId!).single(),
        supabase
          .from('plan_exercises')
          .select('*, exercises(*)')
          .eq('plan_day_id', planDayId!)
          .order('position'),
      ]);
      return { day: day as PlanDay, exercises: (pex ?? []) as (PlanExercise & { exercises: Exercise })[] };
    },
  });

  // Carrega os exercícios do plano quando os dados chegam (ajuste durante o render)
  const [loadedDayId, setLoadedDayId] = useState<string | null>(null);
  if (planData && loadedDayId !== planData.day.id) {
    setLoadedDayId(planData.day.id);
    setDayName(planData.day.name);
    setItems(
      planData.exercises.map((pe) => ({
        exercise: pe.exercises,
        prescription: pe,
        sets: [],
      })),
    );
  }

  // Cronómetro de descanso
  useEffect(() => {
    if (restLeft === null || restLeft <= 0) return;
    const t = setTimeout(() => setRestLeft(restLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  const { data: searchResults } = useQuery({
    queryKey: ['exercise_search', search],
    enabled: search.length >= 2,
    queryFn: async (): Promise<Exercise[]> => {
      const supabase = createClient();
      const { data } = await supabase.from('exercises').select('*').ilike('name', `%${search}%`).limit(8);
      return (data ?? []) as Exercise[];
    },
  });

  const warmup = useMemo(() => generateWarmup(items.map((i) => i.exercise)), [items]);

  function addExercise(e: Exercise) {
    setItems((prev) => [...prev, { exercise: e, sets: [] }]);
    setSearch('');
  }

  function logSet(index: number, set: LoggedSet, restSeconds: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, sets: [...item.sets, set] } : item)));
    if (restSeconds > 0) setRestLeft(restSeconds);
  }

  function removeSet(index: number, setIndex: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, sets: item.sets.filter((_, si) => si !== setIndex) } : item)),
    );
  }

  async function finish() {
    setFinishing(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const logged = items.filter((i) => i.sets.length > 0);
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        date: todayStr(),
        plan_day_id: planDayId,
        name: dayName,
        started_at: startedAt.current,
        finished_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error || !session) {
      setFinishing(false);
      return;
    }

    const setRows = logged.flatMap((item) =>
      item.sets.map((s, si) => ({
        session_id: session.id,
        exercise_id: item.exercise.id,
        set_index: si,
        reps: s.reps ?? null,
        weight_kg: s.weight_kg ?? null,
        duration_seconds: s.duration_seconds ?? null,
        distance_km: s.distance_km ?? null,
        avg_hr: s.avg_hr ?? null,
      })),
    );
    if (setRows.length > 0) await supabase.from('session_sets').insert(setRows);

    // Deteção de PRs (1RM estimado por Epley vs histórico)
    const prs: string[] = [];
    const strengthItems = logged.filter((i) => i.sets.some((s) => s.reps && s.weight_kg));
    if (strengthItems.length > 0) {
      const ids = strengthItems.map((i) => i.exercise.id);
      const { data: history } = await supabase
        .from('session_sets')
        .select('exercise_id, reps, weight_kg, session_id')
        .in('exercise_id', ids)
        .not('weight_kg', 'is', null)
        .neq('session_id', session.id);
      for (const item of strengthItems) {
        const best = Math.max(
          ...item.sets.filter((s) => s.reps && s.weight_kg).map((s) => epley1RM(s.weight_kg!, s.reps!)),
        );
        const prevBest = Math.max(
          0,
          ...(history ?? [])
            .filter((h) => h.exercise_id === item.exercise.id && h.reps)
            .map((h) => epley1RM(Number(h.weight_kg), h.reps!)),
        );
        if (best > prevBest && prevBest > 0) prs.push(`${item.exercise.name}: ~${best} kg 1RM 🎉`);
      }
    }

    const volume = sessionVolume(
      logged.flatMap((i) => i.sets.map((s) => ({ reps: s.reps ?? null, weight_kg: s.weight_kg ?? null }))),
    );
    invalidate('workout_sessions', 'sessions_week');
    setSummary({ volume, prs });
    setFinishing(false);
  }

  if (isLoading) return <Spinner />;

  if (summary) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-3 text-2xl font-bold">Treino concluído!</h1>
        {summary.volume > 0 && (
          <p className="mt-1 text-sm text-zinc-500">Volume total: {Math.round(summary.volume)} kg</p>
        )}
        {summary.prs.length > 0 && (
          <div className="mt-4 space-y-1">
            {summary.prs.map((pr) => (
              <p key={pr} className="text-sm font-medium text-emerald-600">
                Novo recorde — {pr}
              </p>
            ))}
          </div>
        )}
        <Link href="/treino" className="mt-6">
          <Button>Voltar ao treino</Button>
        </Link>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        title={dayName}
        action={
          <button className="text-sm text-zinc-500 hover:underline" onClick={() => router.push('/treino')}>
            Sair
          </button>
        }
      />

      {restLeft !== null && restLeft > 0 && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-lg items-center justify-between rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-lg">
          <span className="text-sm font-medium">Descanso</span>
          <span className="text-xl font-bold tabular-nums">
            {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
          </span>
          <button className="rounded-lg bg-white/20 px-2 py-1 text-xs" onClick={() => setRestLeft(null)}>
            Saltar
          </button>
        </div>
      )}

      <div className="space-y-4">
        {warmup.length > 0 && items.length > 0 && (
          <Card>
            <CardTitle>Aquecimento (~5 min)</CardTitle>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
              {warmup.map((w) => (
                <li key={w.name} className="flex justify-between">
                  <span>{w.name}</span>
                  <span className="text-zinc-400">{w.duration}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {items.map((item, index) => (
          <ExerciseLogger
            key={`${item.exercise.id}-${index}`}
            item={item}
            onLog={(set, rest) => logSet(index, set, rest)}
            onRemoveSet={(si) => removeSet(index, si)}
          />
        ))}

        <Card>
          <CardTitle>Adicionar exercício</CardTitle>
          <Input
            id="exsearch"
            placeholder="Pesquisar exercício…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(searchResults ?? []).length > 0 && (
            <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
              {(searchResults ?? []).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="flex w-full items-center justify-between py-2 text-left text-sm"
                  onClick={() => addExercise(e)}
                >
                  <span>{e.name}</span>
                  <span className="text-emerald-600">+</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Button
          className="w-full"
          disabled={finishing || items.every((i) => i.sets.length === 0)}
          onClick={finish}
        >
          {finishing ? 'A guardar…' : 'Terminar treino'}
        </Button>
      </div>
    </main>
  );
}

function ExerciseLogger({
  item,
  onLog,
  onRemoveSet,
}: {
  item: SessionExercise;
  onLog: (set: LoggedSet, restSeconds: number) => void;
  onRemoveSet: (setIndex: number) => void;
}) {
  const isCardio = item.exercise.category === 'cardio';
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [minutes, setMinutes] = useState(String(item.prescription?.duration_minutes ?? ''));
  const [km, setKm] = useState('');
  const [hr, setHr] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const rest = item.prescription?.rest_seconds ?? 90;
  const targetText = item.prescription
    ? isCardio
      ? `${item.prescription.duration_minutes ?? '—'} min`
      : `${item.prescription.sets ?? '—'} × ${item.prescription.reps ?? '—'}`
    : null;

  function add() {
    if (isCardio) {
      const set: LoggedSet = {
        duration_seconds: Math.round(Number(minutes) * 60) || undefined,
        distance_km: Number(km) || undefined,
        avg_hr: Number(hr) || undefined,
      };
      if (!set.duration_seconds && !set.distance_km) return;
      onLog(set, 0);
    } else {
      if (!reps) return;
      onLog({ reps: Number(reps), weight_kg: Number(weight) || undefined }, rest);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <button type="button" className="text-left font-semibold" onClick={() => setShowInfo(!showInfo)}>
            {item.exercise.name} <span className="text-xs text-zinc-400">ⓘ</span>
          </button>
          {targetText && <div className="text-xs text-zinc-400">Alvo: {targetText}</div>}
        </div>
        <span className="text-xs text-zinc-400">{item.sets.length} séries</span>
      </div>

      {showInfo && item.exercise.instructions && (
        <p className="mb-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          {item.exercise.instructions}
        </p>
      )}

      {item.sets.length > 0 && (
        <div className="mb-2 space-y-1">
          {item.sets.map((s, si) => (
            <div key={si} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-800/50">
              <span>
                {isCardio
                  ? [
                      s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : null,
                      s.distance_km ? `${s.distance_km} km` : null,
                      s.avg_hr ? `${s.avg_hr} bpm` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${s.reps} reps${s.weight_kg ? ` × ${s.weight_kg} kg` : ''}`}
              </span>
              <button className="text-zinc-300 hover:text-red-500" onClick={() => onRemoveSet(si)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {isCardio ? (
          <>
            <div className="w-20">
              <Input id={`min-${item.exercise.id}`} label="Min" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
            <div className="w-20">
              <Input id={`km-${item.exercise.id}`} label="Km" type="number" inputMode="decimal" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
            <div className="w-20">
              <Input id={`hr-${item.exercise.id}`} label="FC média" type="number" inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="w-24">
              <Input id={`reps-${item.exercise.id}`} label="Reps" type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div className="w-28">
              <Input id={`w-${item.exercise.id}`} label="Carga" type="number" inputMode="decimal" step="0.5" suffix="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </>
        )}
        <Button variant="secondary" onClick={add}>
          + Série
        </Button>
      </div>
    </Card>
  );
}

export default function SessaoPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SessaoInner />
    </Suspense>
  );
}
