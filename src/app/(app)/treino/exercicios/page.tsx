'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, Chip, PageHeader, Spinner } from '@/components/ui';
import { EQUIPMENT_LABELS, type Exercise } from '@/lib/types';

const CATEGORY_LABELS: Record<Exercise['category'], string> = {
  strength: 'Força',
  cardio: 'Cardio',
  core: 'Core',
  mobility: 'Mobilidade',
};

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from('exercises').select('*').order('name');
      if (error) throw error;
      return data as Exercise[];
    },
  });
}

export default function ExerciciosPage() {
  const { data: exercises, isLoading } = useExercises();
  const [equipment, setEquipment] = useState<string | null>(null);
  const [category, setCategory] = useState<Exercise['category'] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      (exercises ?? []).filter(
        (e) =>
          (!equipment || e.equipment.includes(equipment)) && (!category || e.category === category),
      ),
    [exercises, equipment, category],
  );

  return (
    <main>
      <PageHeader title="Biblioteca de exercícios" subtitle={`${filtered.length} exercícios`} />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
          <Chip key={key} selected={equipment === key} onClick={() => setEquipment(equipment === key ? null : key)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORY_LABELS) as Exercise['category'][]).map((c) => (
          <Chip key={c} selected={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {filtered.map((e) => (
              <div key={e.id} className="py-2.5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpen(open === e.id ? null : e.id)}
                >
                  <div>
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-zinc-400">
                      {CATEGORY_LABELS[e.category]} · {e.primary_muscles.join(', ')}
                    </div>
                  </div>
                  <span className="text-zinc-300">{open === e.id ? '−' : '+'}</span>
                </button>
                {open === e.id && e.instructions && (
                  <p className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                    {e.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}
