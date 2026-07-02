'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email ou palavra-passe incorretos.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl">💪</div>
        <h1 className="mt-2 text-3xl font-bold">VitaOS</h1>
        <p className="mt-1 text-sm text-zinc-500">A tua central de saúde, treino e nutrição.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="password"
          label="Palavra-passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A entrar…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Ainda não tens conta?{' '}
        <Link href="/registar" className="font-medium text-emerald-600 hover:underline">
          Regista-te
        </Link>
      </p>
    </main>
  );
}
