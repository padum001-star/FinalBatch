// Offline demo mode: runs the whole app against an in-memory fake so you can
// click through the UI without a Supabase project.
//
// Everything under src/lib/demo is throwaway. Once real credentials are in
// .env, delete this directory and the `if (DEMO_MODE)` branches in
// src/lib/api/* and src/context/auth-context.tsx.
//
// Gated on __DEV__ as well as the env var so that a stray
// EXPO_PUBLIC_DEMO_MODE=1 can never ship a production build that trusts a
// fabricated session and skips the login screen.
export const DEMO_MODE = __DEV__ && process.env.EXPO_PUBLIC_DEMO_MODE === '1';
