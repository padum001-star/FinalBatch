import * as demo from '@/lib/demo/demo-data';
import { DEMO_MODE } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function fetchProfile(id: string): Promise<Profile> {
  if (DEMO_MODE) return demo.fetchProfile(id);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
  if (DEMO_MODE) return demo.updateProfile(id, patch);
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
