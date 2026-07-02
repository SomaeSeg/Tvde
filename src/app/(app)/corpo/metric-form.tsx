'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate } from '@/lib/hooks';
import { Button, Card, CardTitle, Input } from '@/components/ui';
import { todayStr } from '@/lib/dates';

const SCALE_FIELDS: { key: string; label: string; suffix: string; step?: string }[] = [
  { key: 'body_fat_pct', label: 'Gordura corporal', suffix: '%', step: '0.1' },
  { key: 'visceral_fat', label: 'Gordura visceral', suffix: '', step: '0.5' },
  { key: 'muscle_pct', label: 'Massa muscular', suffix: '%', step: '0.1' },
  { key: 'skeletal_muscle_pct', label: 'Músculo esquelético', suffix: '%', step: '0.1' },
  { key: 'water_pct', label: 'Água corporal', suffix: '%', step: '0.1' },
  { key: 'bone_mass_kg', label: 'Massa óssea', suffix: 'kg', step: '0.1' },
  { key: 'bmr_kcal', label: 'TMB', suffix: 'kcal', step: '1' },
  { key: 'metabolic_age', label: 'Idade metabólica', suffix: 'anos', step: '1' },
  { key: 'protein_pct', label: 'Proteína corporal', suffix: '%', step: '0.1' },
];

export function MetricForm() {
  const invalidate = useInvalidate();
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState('');
  const [showScale, setShowScale] = useState(false);
  const [scale, setScale] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const scaleValues = Object.fromEntries(
      Object.entries(scale)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, Number(v)]),
    );

    const { error } = await supabase.from('body_metrics').upsert(
      {
        user_id: user.id,
        date,
        ...(weight !== '' ? { weight_kg: Number(weight) } : {}),
        ...scaleValues,
      },
      { onConflict: 'user_id,date' },
    );

    setSaving(false);
    if (error) {
      setMessage('Erro ao guardar: ' + error.message);
      return;
    }
    setMessage('Registado ✓');
    setWeight('');
    setScale({});
    invalidate('body_metrics');
  }

  return (
    <Card>
      <CardTitle
        action={
          <button
            type="button"
            onClick={() => setShowScale(!showScale)}
            className="text-xs font-medium text-emerald-600 hover:underline"
          >
            {showScale ? 'Esconder balança' : '+ Métricas da balança'}
          </button>
        }
      >
        Registo de hoje
      </CardTitle>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input id="date" label="Data" type="date" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            id="weight"
            label="Peso"
            type="number"
            inputMode="decimal"
            step="0.1"
            suffix="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        {showScale && (
          <div className="grid grid-cols-2 gap-3">
            {SCALE_FIELDS.map((f) => (
              <Input
                key={f.key}
                id={f.key}
                label={f.label}
                type="number"
                inputMode="decimal"
                step={f.step}
                suffix={f.suffix}
                value={scale[f.key] ?? ''}
                onChange={(e) => setScale((s) => ({ ...s, [f.key]: e.target.value }))}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || (weight === '' && Object.values(scale).every((v) => v === ''))}>
            {saving ? 'A guardar…' : 'Registar'}
          </Button>
          {message && <span className="text-sm text-zinc-500">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
