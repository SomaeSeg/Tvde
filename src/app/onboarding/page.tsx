'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Card, Chip, Input, Select } from '@/components/ui';
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
  type Sex,
} from '@/lib/calc';
import { EQUIPMENT_LABELS } from '@/lib/types';
import { todayStr } from '@/lib/dates';

const STEPS = ['Sobre ti', 'Objetivo', 'Equipamento', 'Plano'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sex, setSex] = useState<Sex>('male');
  const [birthDate, setBirthDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('lose_fat');
  const [rate, setRate] = useState('0.5');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [equipment, setEquipment] = useState<string[]>(['bodyweight']);

  const canNext =
    step === 0
      ? birthDate !== '' && Number(heightCm) > 100 && Number(weightKg) > 30
      : step === 2
        ? equipment.length > 0
        : true;

  const weight = Number(weightKg);
  const height = Number(heightCm);
  const age = birthDate ? ageFromBirthDate(birthDate) : 30;
  const bmr = weight && height ? bmrMifflin(sex, weight, height, age) : 0;
  const dailyTdee = bmr ? tdee(bmr, activity) : 0;
  const kcal = dailyTdee ? calorieTarget(dailyTdee, goalType, Number(rate) || 0.5, sex) : 0;
  const macros = kcal ? macroTargets(kcal, weight, goalType) : null;

  function toggleEquipment(key: string) {
    setEquipment((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  }

  async function finish() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const today = todayStr();
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        sex,
        birth_date: birthDate,
        height_cm: height,
        activity_level: activity,
        goal_type: goalType,
        goal_rate_kg_week: Number(rate) || 0.5,
        equipment,
        onboarding_done: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }
    if (macros) {
      await supabase.from('nutrition_targets').insert({
        user_id: user.id,
        effective_from: today,
        kcal: macros.kcal,
        protein_g: macros.proteinG,
        carbs_g: macros.carbsG,
        fat_g: macros.fatG,
      });
    }
    await supabase
      .from('body_metrics')
      .upsert({ user_id: user.id, date: today, weight_kg: weight }, { onConflict: 'user_id,date' });
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-zinc-500">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? 'text-emerald-600' : ''}>
              {s}
            </span>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Sobre ti</h1>
          <div className="flex gap-2">
            <Chip selected={sex === 'male'} onClick={() => setSex('male')}>
              Homem
            </Chip>
            <Chip selected={sex === 'female'} onClick={() => setSex('female')}>
              Mulher
            </Chip>
          </div>
          <Input
            id="birth"
            label="Data de nascimento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <Input
            id="height"
            label="Altura"
            type="number"
            inputMode="decimal"
            suffix="cm"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
          <Input
            id="weight"
            label="Peso atual"
            type="number"
            inputMode="decimal"
            step="0.1"
            suffix="kg"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Qual é o teu objetivo?</h1>
          <div className="space-y-2">
            {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoalType(g)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                  goalType === g
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                    : 'border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900'
                }`}
              >
                <span className="font-medium">{GOAL_LABELS[g]}</span>
              </button>
            ))}
          </div>
          {(goalType === 'lose_fat' || goalType === 'gain_muscle') && (
            <Select id="rate" label="Ritmo desejado" value={rate} onChange={(e) => setRate(e.target.value)}>
              <option value="0.25">Suave — 0,25 kg/semana</option>
              <option value="0.5">Moderado — 0,5 kg/semana</option>
              <option value="0.75">Rápido — 0,75 kg/semana</option>
              <option value="1">Agressivo — 1 kg/semana</option>
            </Select>
          )}
          <Select
            id="activity"
            label="Nível de atividade atual"
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
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Que equipamento tens em casa?</h1>
          <p className="text-sm text-zinc-500">Os planos de treino adaptam-se ao que tiveres.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(EQUIPMENT_LABELS).map(([key, label]) => (
              <Chip key={key} selected={equipment.includes(key)} onClick={() => toggleEquipment(key)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {step === 3 && macros && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">O teu plano diário</h1>
          <Card>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600">{macros.kcal}</div>
              <div className="text-sm text-zinc-500">kcal por dia</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold">{macros.proteinG} g</div>
                <div className="text-xs text-zinc-500">Proteína</div>
              </div>
              <div>
                <div className="text-lg font-bold">{macros.carbsG} g</div>
                <div className="text-xs text-zinc-500">Hidratos</div>
              </div>
              <div>
                <div className="text-lg font-bold">{macros.fatG} g</div>
                <div className="text-xs text-zinc-500">Gordura</div>
              </div>
            </div>
          </Card>
          <p className="text-sm text-zinc-500">
            Baseado numa TMB de {bmr} kcal e gasto diário estimado de {dailyTdee} kcal. Podes ajustar tudo
            mais tarde no Perfil.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-8">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
            Voltar
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext} onClick={() => setStep(step + 1)} className="flex-1">
            Continuar
          </Button>
        ) : (
          <Button disabled={saving} onClick={finish} className="flex-1">
            {saving ? 'A guardar…' : 'Começar 🚀'}
          </Button>
        )}
      </div>
    </main>
  );
}
