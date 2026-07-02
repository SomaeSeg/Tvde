'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Input } from '@/components/ui';

export default function RegistarPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) {
      setError(error.message === 'User already registered' ? 'Este email já está registado.' : error.message);
      setLoading(false);
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl">💪</div>
        <h1 className="mt-2 text-3xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-zinc-500">Começa a tua jornada de saúde hoje.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input id="name" label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'A criar conta…' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium text-emerald-600 hover:underline">
          Entra aqui
        </Link>
      </p>
    </main>
  );
}
