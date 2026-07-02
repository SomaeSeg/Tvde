import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Exportação total dos dados do utilizador em JSON — sem lock-in.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tables = [
    'profiles',
    'body_metrics',
    'body_measurements',
    'goals',
    'food_logs',
    'water_logs',
    'meal_templates',
    'nutrition_targets',
    'workout_sessions',
    'daily_checkins',
  ] as const;

  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    app: 'VitaOS',
  };

  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    result[table] = data ?? [];
  }

  // Séries das sessões (via join implícito pelas RLS policies)
  const { data: sets } = await supabase
    .from('session_sets')
    .select('*, workout_sessions!inner(user_id)');
  result['session_sets'] = (sets ?? []).map((s) => {
    const rest = { ...(s as Record<string, unknown>) };
    delete rest['workout_sessions'];
    return rest;
  });

  return new NextResponse(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="vitaos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
