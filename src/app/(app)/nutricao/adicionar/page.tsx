'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useInvalidate } from '@/lib/hooks';
import { Button, Card, Input, PageHeader, Spinner } from '@/components/ui';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { portionMacros } from '@/lib/calc';
import type { OffFood } from '@/lib/off';
import { MEAL_LABELS, type Food, type MealType } from '@/lib/types';
import { todayStr } from '@/lib/dates';

interface Candidate {
  id?: string; // id local se já existe na BD
  name: string;
  brand: string | null;
  barcode: string | null;
  source: 'off' | 'manual' | 'base';
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  fiber_100: number | null;
  sugar_100: number | null;
  salt_100: number | null;
  serving_g: number | null;
}

function foodToCandidate(f: Food): Candidate {
  return { ...f, id: f.id };
}

function offToCandidate(p: OffFood): Candidate {
  return { ...p, source: 'off' };
}

function AdicionarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const invalidate = useInvalidate();
  const meal = (params.get('meal') ?? 'lunch') as MealType;
  const date = params.get('date') ?? todayStr();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [localResults, setLocalResults] = useState<Candidate[]>([]);
  const [offResults, setOffResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [grams, setGrams] = useState('100');
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setLocalResults([]);
      setOffResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);

    const supabase = createClient();
    Promise.all([
      supabase.from('foods').select('*').ilike('name', `%${debounced}%`).limit(12),
      fetch(`/api/off/search?q=${encodeURIComponent(debounced)}`).then((r) => r.json()),
    ])
      .then(([localRes, offRes]) => {
        if (cancelled) return;
        const local = ((localRes.data ?? []) as Food[]).map(foodToCandidate);
        setLocalResults(local);
        const localBarcodes = new Set(local.map((f) => f.barcode).filter(Boolean));
        setOffResults(
          ((offRes.products ?? []) as OffFood[])
            .filter((p) => !p.barcode || !localBarcodes.has(p.barcode))
            .map(offToCandidate),
        );
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function onBarcode(code: string) {
    setScanning(false);
    setScanMessage(null);
    const supabase = createClient();
    const { data: local } = await supabase.from('foods').select('*').eq('barcode', code).limit(1).maybeSingle();
    if (local) {
      select(foodToCandidate(local as Food));
      return;
    }
    const res = await fetch(`/api/off/barcode/${code}`).then((r) => r.json());
    if (res.product) {
      select(offToCandidate(res.product));
    } else {
      setScanMessage(`Produto ${code} não encontrado. Podes criá-lo manualmente em baixo.`);
      setShowManual(true);
    }
  }

  function select(c: Candidate) {
    setSelected(c);
    setGrams(String(c.serving_g ?? 100));
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let foodId = selected.id;
    if (!foodId) {
      // Alimento OFF ainda não em cache — guarda-o como global
      const { data: inserted, error } = await supabase
        .from('foods')
        .insert({
          user_id: null,
          name: selected.name,
          brand: selected.brand,
          barcode: selected.barcode,
          source: 'off',
          kcal_100: selected.kcal_100,
          protein_100: selected.protein_100,
          carbs_100: selected.carbs_100,
          fat_100: selected.fat_100,
          fiber_100: selected.fiber_100,
          sugar_100: selected.sugar_100,
          salt_100: selected.salt_100,
          serving_g: selected.serving_g,
        })
        .select('id')
        .single();
      if (error || !inserted) {
        setSaving(false);
        return;
      }
      foodId = inserted.id;
    }

    const q = Number(grams);
    const macros = portionMacros(selected, q);
    await supabase.from('food_logs').insert({
      user_id: user.id,
      date,
      meal,
      food_id: foodId,
      description: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
      quantity_g: q,
      kcal: macros.kcal,
      protein_g: macros.proteinG,
      carbs_g: macros.carbsG,
      fat_g: macros.fatG,
    });
    invalidate('food_logs');
    router.push('/nutricao');
  }

  async function createManual() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: inserted, error } = await supabase
      .from('foods')
      .insert({
        user_id: user.id,
        name: manual.name,
        source: 'manual',
        kcal_100: Number(manual.kcal),
        protein_100: Number(manual.protein) || 0,
        carbs_100: Number(manual.carbs) || 0,
        fat_100: Number(manual.fat) || 0,
      })
      .select('*')
      .single();
    setSaving(false);
    if (!error && inserted) {
      setShowManual(false);
      select(foodToCandidate(inserted as Food));
    }
  }

  const preview = useMemo(() => {
    if (!selected) return null;
    return portionMacros(selected, Number(grams) || 0);
  }, [selected, grams]);

  return (
    <main>
      <PageHeader
        title={`Adicionar ao ${MEAL_LABELS[meal].toLowerCase()}`}
        action={
          <button className="text-sm text-zinc-500 hover:underline" onClick={() => router.push('/nutricao')}>
            Cancelar
          </button>
        }
      />

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              id="q"
              placeholder="Pesquisar alimento (ex.: iogurte grego)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <Button variant="secondary" onClick={() => setScanning(true)} title="Ler código de barras">
            📷
          </Button>
        </div>

        {scanMessage && <p className="text-sm text-amber-600">{scanMessage}</p>}

        {selected && preview && (
          <Card className="border-emerald-500/40">
            <div className="mb-2">
              <div className="font-semibold">{selected.name}</div>
              {selected.brand && <div className="text-xs text-zinc-400">{selected.brand}</div>}
            </div>
            <div className="flex items-end gap-3">
              <div className="w-28">
                <Input
                  id="grams"
                  label="Quantidade"
                  type="number"
                  inputMode="decimal"
                  suffix="g"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div className="flex-1 text-sm">
                <div className="text-lg font-bold">{preview.kcal} kcal</div>
                <div className="text-xs text-zinc-400">
                  P {preview.proteinG} · H {preview.carbsG} · G {preview.fatG}
                </div>
              </div>
              <Button onClick={save} disabled={saving || Number(grams) <= 0}>
                {saving ? '…' : 'Adicionar'}
              </Button>
            </div>
          </Card>
        )}

        {searching && <Spinner />}

        {localResults.length > 0 && (
          <ResultList title="Os teus alimentos e base PT" items={localResults} onSelect={select} />
        )}
        {offResults.length > 0 && (
          <ResultList title="Open Food Facts" items={offResults} onSelect={select} />
        )}
        {debounced.length >= 2 && !searching && localResults.length === 0 && offResults.length === 0 && (
          <p className="text-center text-sm text-zinc-400">Nada encontrado. Cria o alimento manualmente em baixo.</p>
        )}

        <div>
          <button
            type="button"
            className="text-sm font-medium text-emerald-600 hover:underline"
            onClick={() => setShowManual(!showManual)}
          >
            {showManual ? '− Esconder' : '+ Criar alimento manualmente'}
          </button>
          {showManual && (
            <Card className="mt-2">
              <div className="space-y-3">
                <Input
                  id="mname"
                  label="Nome"
                  value={manual.name}
                  onChange={(e) => setManual({ ...manual, name: e.target.value })}
                />
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    id="mkcal"
                    label="kcal/100g"
                    type="number"
                    inputMode="decimal"
                    value={manual.kcal}
                    onChange={(e) => setManual({ ...manual, kcal: e.target.value })}
                  />
                  <Input
                    id="mprot"
                    label="Prot."
                    type="number"
                    inputMode="decimal"
                    value={manual.protein}
                    onChange={(e) => setManual({ ...manual, protein: e.target.value })}
                  />
                  <Input
                    id="mcarb"
                    label="Hidr."
                    type="number"
                    inputMode="decimal"
                    value={manual.carbs}
                    onChange={(e) => setManual({ ...manual, carbs: e.target.value })}
                  />
                  <Input
                    id="mfat"
                    label="Gord."
                    type="number"
                    inputMode="decimal"
                    value={manual.fat}
                    onChange={(e) => setManual({ ...manual, fat: e.target.value })}
                  />
                </div>
                <Button size="sm" disabled={saving || !manual.name || !manual.kcal} onClick={createManual}>
                  Criar e selecionar
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {scanning && <BarcodeScanner onDetected={onBarcode} onClose={() => setScanning(false)} />}
    </main>
  );
}

function ResultList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: Candidate[];
  onSelect: (c: Candidate) => void;
}) {
  return (
    <Card>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</div>
      <div className="divide-y divide-black/5 dark:divide-white/5">
        {items.map((c, i) => (
          <button
            key={c.id ?? c.barcode ?? i}
            type="button"
            className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            onClick={() => onSelect(c)}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="text-xs text-zinc-400">
                {c.brand ? `${c.brand} · ` : ''}
                {Math.round(c.kcal_100)} kcal · P {Math.round(c.protein_100)} g /100g
              </span>
            </span>
            <span className="ml-2 text-emerald-600">+</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function AdicionarPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AdicionarInner />
    </Suspense>
  );
}
