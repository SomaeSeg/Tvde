'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle, Chip, EmptyState, Spinner, Stat } from '@/components/ui';
import { bmi, bmiCategory, movingAverage, trendPerDay } from '@/lib/calc';
import { formatDatePt } from '@/lib/dates';
import { useProfile } from '@/lib/hooks';
import type { BodyMetric } from '@/lib/types';

const METRICS = [
  { key: 'weight_kg', label: 'Peso', suffix: 'kg' },
  { key: 'body_fat_pct', label: 'Gordura', suffix: '%' },
  { key: 'visceral_fat', label: 'Visceral', suffix: '' },
  { key: 'muscle_pct', label: 'Músculo', suffix: '%' },
  { key: 'metabolic_age', label: 'Idade metab.', suffix: 'anos' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export function useBodyMetrics() {
  return useQuery({
    queryKey: ['body_metrics'],
    queryFn: async (): Promise<BodyMetric[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as BodyMetric[];
    },
  });
}

export function MetricChart() {
  const { data: metrics, isLoading } = useBodyMetrics();
  const { data: profile } = useProfile();
  const [metricKey, setMetricKey] = useState<MetricKey>('weight_kg');

  const meta = METRICS.find((m) => m.key === metricKey)!;

  const { chartData, latest, avg7, trend } = useMemo(() => {
    const points = (metrics ?? [])
      .filter((m) => m[metricKey] !== null)
      .map((m) => ({ date: m.date, value: Number(m[metricKey]) }));
    const ma = movingAverage(points, 7);
    const maByDate = new Map(ma.map((p) => [p.date, p.value]));
    return {
      chartData: points.map((p) => ({
        date: p.date,
        label: formatDatePt(p.date),
        valor: p.value,
        media7d: maByDate.get(p.date),
      })),
      latest: points.at(-1) ?? null,
      avg7: ma.at(-1)?.value ?? null,
      trend: trendPerDay(points, 28),
    };
  }, [metrics, metricKey]);

  if (isLoading) return <Spinner />;

  const trendWeekly = trend !== null ? Math.round(trend * 7 * 100) / 100 : null;
  const latestBmi =
    metricKey === 'weight_kg' && latest && profile?.height_cm ? bmi(latest.value, profile.height_cm) : null;

  return (
    <Card>
      <CardTitle>Evolução</CardTitle>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <Chip key={m.key} selected={metricKey === m.key} onClick={() => setMetricKey(m.key)}>
            {m.label}
          </Chip>
        ))}
      </div>

      {chartData.length === 0 ? (
        <EmptyState title="Ainda sem registos" hint="Regista o teu primeiro valor acima." />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat label="Atual" value={`${latest!.value}${meta.suffix ? ' ' + meta.suffix : ''}`} />
            <Stat label="Média 7d" value={avg7 !== null ? `${avg7}` : '—'} />
            <Stat
              label="Tendência/sem"
              value={trendWeekly !== null ? `${trendWeekly > 0 ? '+' : ''}${trendWeekly}` : '—'}
              tone={trendWeekly === null ? 'default' : trendWeekly < 0 ? 'good' : trendWeekly > 0 ? 'warn' : 'default'}
            />
          </div>
          {latestBmi !== null && (
            <p className="mb-3 text-xs text-zinc-500">
              IMC {latestBmi} — {bmiCategory(latestBmi)}
            </p>
          )}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
                />
                <Tooltip
                  formatter={(value) => [`${value} ${meta.suffix}`.trim()]}
                  labelFormatter={(label) => String(label)}
                />
                <Line type="monotone" dataKey="valor" stroke="#a1a1aa" strokeWidth={1} dot={false} name="Diário" />
                <Line
                  type="monotone"
                  dataKey="media7d"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                  name="Média 7 dias"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center text-[11px] text-zinc-400">
            Linha verde: média de 7 dias (a que interessa). Cinzenta: valor diário.
          </p>
        </>
      )}
    </Card>
  );
}
