import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TabBar } from '@/components/tab-bar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single();

  if (profile && !profile.onboarding_done) redirect('/onboarding');

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pb-24 pt-6">
      {children}
      <TabBar />
    </div>
  );
}
