'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { NutritionTarget, Profile } from '@/lib/types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

/** Alvo nutricional em vigor (o mais recente com effective_from <= hoje). */
export function useNutritionTarget() {
  return useQuery({
    queryKey: ['nutrition_target'],
    queryFn: async (): Promise<NutritionTarget | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as NutritionTarget | null;
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => {
    for (const key of keys) qc.invalidateQueries({ queryKey: [key] });
  };
}
