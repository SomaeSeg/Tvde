// Datas em hora local (o diário é sempre no fuso do utilizador).

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function formatDatePt(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
  });
}

export const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Índice 0=segunda … 6=domingo para uma data. */
export function weekdayIndex(dateStr: string): number {
  const js = new Date(dateStr + 'T00:00:00').getDay(); // 0=domingo
  return (js + 6) % 7;
}
