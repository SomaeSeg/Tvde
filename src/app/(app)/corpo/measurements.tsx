'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate, useProfile } from '@/lib/hooks';
import { Button, Card, CardTitle, Input, Select, Spinner } from '@/components/ui';
import { SITE_LABELS, type BodyMeasurement, type MeasurementSite } from '@/lib/types';
import { formatDatePt, todayStr } from '@/lib/dates';
import { waistToHeight, waistToHip } from '@/lib/calc';

export function Measurements() {
  const invalidate = useInvalidate();
  const { data: profile } = useProfile();
  const [site, setSite] = useState<MeasurementSite>('waist');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: measurements, isLoading } = useQuery({
    queryKey: ['body_measurements'],
    queryFn: async (): Promise<BodyMeasurement[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as BodyMeasurement[];
    },
  });

  // Último valor e anterior por local
  const summary = useMemo(() => {
    const bySite = new Map<MeasurementSite, BodyMeasurement[]>();
    for (const m of measurements ?? []) {
      const list = bySite.get(m.site) ?? [];
      list.push(m);
      bySite.set(m.site, list);
    }
    return (Object.keys(SITE_LABELS) as MeasurementSite[])
      .map((s) => {
        const list = bySite.get(s) ?? [];
        if (list.length === 0) return null;
        const [last, prev] = list;
        return {
          site: s,
          last,
          delta: prev ? Math.round((Number(last.value_cm) - Number(prev.value_cm)) * 10) / 10 : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [measurements]);

  const waist = summary.find((s) => s.site === 'waist')?.last.value_cm;
  const hips = summary.find((s) => s.site === 'hips')?.last.value_cm;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('body_measurements')
      .upsert(
        { user_id: user.id, date: todayStr(), site, value_cm: Number(value) },
        { onConflict: 'user_id,date,site' },
      );
    setValue('');
    setSaving(false);
    invalidate('body_measurements');
  }

  return (
    <Card>
      <CardTitle>Medidas corporais</CardTitle>
      <form onSubmit={save} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Select id="site" label="Local" value={site} onChange={(e) => setSite(e.target.value as MeasurementSite)}>
            {Object.entries(SITE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-28">
          <Input
            id="value"
            label="Valor"
            type="number"
            inputMode="decimal"
            step="0.1"
            suffix="cm"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving || value === ''}>
          +
        </Button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : summary.length === 0 ? (
        <p className="text-sm text-zinc-400">Sem medidas registadas. A cintura é a mais importante — começa por ela.</p>
      ) : (
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {summary.map(({ site: s, last, delta }) => (
            <div key={s} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{SITE_LABELS[s]}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">{formatDatePt(last.date)}</span>
                <span className="font-semibold">{last.value_cm} cm</span>
                {delta !== null && delta !== 0 && (
                  <span className={`text-xs font-medium ${delta < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {waist && (profile?.height_cm || hips) && (
        <div className="mt-3 flex gap-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          {profile?.height_cm && (
            <span>
              Cintura/altura: <b>{waistToHeight(Number(waist), profile.height_cm)}</b>{' '}
              {waistToHeight(Number(waist), profile.height_cm) < 0.5 ? '✓ saudável' : '(alvo: < 0,5)'}
            </span>
          )}
          {hips && (
            <span>
              Cintura/anca: <b>{waistToHip(Number(waist), Number(hips))}</b>
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
