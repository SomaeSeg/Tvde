'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate, useProfile } from '@/lib/hooks';
import { Button, Card, CardTitle, Chip, Input, PageHeader, Select, Spinner } from '@/components/ui';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  ageFromBirthDate,
  bmrMifflin,
  calorieTarget,
  macroTargets,
  tdee,
  type ActivityLevel,
  type GoalType,
} from '@/lib/calc';
import { EQUIPMENT_LABELS } from '@/lib/types';
import { todayStr } from '@/lib/dates';

export default function PerfilPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const invalidate = useInvalidate();

  const [heightCm, setHeightCm] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [goalType, setGoalType] = useState<GoalType>('lose_fat');
  const [rate, setRate] = useState('0.5');
  const [waterTarget, setWaterTarget] = useState('2000');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Preenche o formulário quando o perfil chega (ajuste de estado durante o render)
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (profile && loadedFor !== profile.id) {
    setLoadedFor(profile.id);
    setHeightCm(String(profile.height_cm ?? ''));
    setActivity(profile.activity_level);
    setGoalType(profile.goal_type);
    setRate(String(profile.goal_rate_kg_week));
    setWaterTarget(String(profile.water_target_ml));
    setEquipment(profile.equipment ?? []);
  }

  if (isLoading || !profile) return <Spinner />;

  function toggleEquipment(key: string) {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    const supabase = createClient();

    await supabase
      .from('profiles')
      .update({
        height_cm: Number(heightCm) || profile.height_cm,
        activity_level: activity,
        goal_type: goalType,
        goal_rate_kg_week: Number(rate) || 0.5,
        water_target_ml: Number(waterTarget) || 2000,
        equipment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    // Recalcula o alvo nutricional com o peso mais recente
    const { data: lastWeight } = await supabase
      .from('body_metrics')
      .select('weight_kg')
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const weight = lastWeight?.weight_kg;
    if (weight && profile.sex && profile.birth_date && Number(heightCm)) {
      const bmr = bmrMifflin(profile.sex, weight, Number(heightCm), ageFromBirthDate(profile.birth_date));
      const kcal = calorieTarget(tdee(bmr, activity), goalType, Number(rate) || 0.5, profile.sex);
      const macros = macroTargets(kcal, weight, goalType);
      await supabase.from('nutrition_targets').upsert(
        {
          user_id: profile.id,
          effective_from: todayStr(),
          kcal: macros.kcal,
          protein_g: macros.proteinG,
          carbs_g: macros.carbsG,
          fat_g: macros.fatG,
        },
        { onConflict: 'user_id,effective_from', ignoreDuplicates: false },
      );
    }

    invalidate('profile', 'nutrition_target');
    setSaving(false);
    setSaved(true);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main>
      <PageHeader
        title="Perfil"
        subtitle={`${profile.display_name ?? ''} · ${profile.birth_date ? ageFromBirthDate(profile.birth_date) + ' anos' : ''}`}
      />

      <div className="space-y-4">
        <Card>
          <CardTitle>Objetivo</CardTitle>
          <div className="space-y-3">
            <Select id="goal" label="Objetivo" value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
              {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
            {(goalType === 'lose_fat' || goalType === 'gain_muscle') && (
              <Select id="rate" label="Ritmo" value={rate} onChange={(e) => setRate(e.target.value)}>
                <option value="0.25">0,25 kg/semana</option>
                <option value="0.5">0,5 kg/semana</option>
                <option value="0.75">0,75 kg/semana</option>
                <option value="1">1 kg/semana</option>
              </Select>
            )}
            <Select
              id="activity"
              label="Nível de atividade"
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <option key={a} value={a}>
                  {ACTIVITY_LABELS[a]}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          <CardTitle>Dados físicos</CardTitle>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="height"
              label="Altura"
              type="number"
              suffix="cm"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <Input
              id="water"
              label="Meta de água"
              type="number"
              suffix="ml"
              value={waterTarget}
              onChange={(e) => setWaterTarget(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Equipamento em casa</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
              <Chip key={key} selected={equipment.includes(key)} onClick={() => toggleEquipment(key)}>
                {label}
              </Chip>
            ))}
          </div>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'A guardar…' : saved ? 'Guardado ✓' : 'Guardar e recalcular alvo'}
        </Button>

        <Card>
          <CardTitle>Dados</CardTitle>
          <a
            href="/api/export"
            className="block w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Exportar todos os meus dados (JSON)
          </a>
        </Card>

        <Button variant="secondary" onClick={logout} className="w-full">
          Terminar sessão
        </Button>
      </div>
    </main>
  );
}
