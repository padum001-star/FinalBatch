import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { DEMO_MODE } from '@/lib/demo/demo-mode';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// The values .env.example ships with. They're non-empty, so a plain presence
// check lets them through and the client builds fine -- then every auth and
// DB call dies later with an opaque "Network request failed" against a host
// that doesn't resolve. Catch them here instead.
const PLACEHOLDER_VALUES = ['https://your-project-ref.supabase.co', 'your-anon-key'];

function isUnset(value: string | undefined): value is undefined {
  return !value || PLACEHOLDER_VALUES.includes(value);
}

// In demo mode nothing ever reaches this client, so unset credentials are
// fine -- createClient still needs syntactically valid arguments though.
if (!DEMO_MODE && (isUnset(supabaseUrl) || isUnset(supabaseAnonKey))) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing or still set to the .env.example placeholders. ' +
      'Create a Supabase project, then put its real URL and anon key in .env (Project Settings -> API). ' +
      'To click through the UI without a backend instead, set EXPO_PUBLIC_DEMO_MODE=1.',
  );
}

// Table/RPC shapes are hand-typed in src/types/database.ts and applied at the
// call site in src/lib/api/* instead of as a client generic -- supabase-js's
// generated-Database generic expects a shape (Relationships, etc.) that's
// normally produced by `supabase gen types`, not worth hand-rolling here.
export const supabase = createClient(supabaseUrl ?? 'https://demo.invalid', supabaseAnonKey ?? 'demo-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
