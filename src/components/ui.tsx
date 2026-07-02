'use client';

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-black/8 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{children}</h2>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50',
    secondary:
      'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    ghost: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm font-medium' };
  return (
    <button
      className={`rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; suffix?: string };

export function Input({ label, suffix, className = '', id, ...props }: InputProps) {
  const input = (
    <div className="relative">
      <input
        id={id}
        className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-zinc-900 ${suffix ? 'pr-12' : ''} ${className}`}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">
          {suffix}
        </span>
      )}
    </div>
  );
  if (!label) return input;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {input}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export function Select({ label, className = '', children, id, ...props }: SelectProps) {
  const select = (
    <select
      id={id}
      className={`w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-zinc-900 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
  if (!label) return select;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {select}
    </label>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    default: 'text-zinc-900 dark:text-zinc-100',
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-red-600 dark:text-red-400',
  };
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-0.5 text-xl font-bold ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, tone = 'emerald' }: { value: number; max: number; tone?: 'emerald' | 'sky' | 'amber' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  const tones = { emerald: 'bg-emerald-500', sky: 'bg-sky-500', amber: 'bg-amber-500' };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : tones[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-black/10 bg-white text-zinc-700 hover:border-emerald-400 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 py-8 text-center dark:border-white/15">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
    </div>
  );
}
