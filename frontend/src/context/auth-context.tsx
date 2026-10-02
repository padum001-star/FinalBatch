import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { fetchProfile, updateProfile as updateProfileApi } from '@/lib/api/profiles';
import * as demo from '@/lib/demo/demo-data';
import { DEMO_MODE } from '@/lib/demo/demo-mode';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

interface SignUpShopperInput {
  email: string;
  password: string;
  fullName: string;
}

interface SignUpBusinessInput {
  email: string;
  password: string;
  businessName: string;
  address: string;
  phone?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUpShopper: (input: SignUpShopperInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signUpBusiness: (input: SignUpBusinessInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Demo mode only -- no-op against a real Supabase project. */
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const initialDemoProfile = () => (DEMO_MODE ? demo.demoProfileForRole('shopper') : null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // In demo mode the session is seeded synchronously so the app opens straight
  // into the tabs -- no auth round trip, so nothing to initialize and no
  // setState from inside an effect.
  const [session, setSession] = useState<Session | null>(() => {
    const p = initialDemoProfile();
    return p ? demo.demoSession(p) : null;
  });
  const [profile, setProfile] = useState<Profile | null>(initialDemoProfile);
  const [initializing, setInitializing] = useState(!DEMO_MODE);
  const demoRoleRef = useRef<UserRole>('shopper');

  async function loadProfile(userId: string) {
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }

  function applyDemoRole(role: UserRole) {
    const demoProfile = demo.demoProfileForRole(role);
    demoRoleRef.current = role;
    demo.setCurrentDemoUser(demoProfile.id);
    setProfile(demoProfile);
    setSession(demo.demoSession(demoProfile));
  }

  useEffect(() => {
    if (DEMO_MODE) return;

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (DEMO_MODE) {
      // Any credentials work; you come back as whoever you last were.
      applyDemoRole(demoRoleRef.current);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpShopper({ email, password, fullName }: SignUpShopperInput) {
    if (DEMO_MODE) {
      applyDemoRole('shopper');
      return { needsEmailConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'shopper' as UserRole, full_name: fullName } },
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
    return { needsEmailConfirmation: !data.session };
  }

  async function signUpBusiness({ email, password, businessName, address, phone }: SignUpBusinessInput) {
    if (DEMO_MODE) {
      applyDemoRole('business');
      return { needsEmailConfirmation: false };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'business' as UserRole,
          full_name: businessName,
          business_name: businessName,
          address,
          phone: phone ?? null,
        },
      },
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
    return { needsEmailConfirmation: !data.session };
  }

  async function signOut() {
    if (DEMO_MODE) {
      setSession(null);
      setProfile(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function updateProfile(patch: Partial<Profile>) {
    if (!session) throw new Error('Not signed in');
    const updated = await updateProfileApi(session.user.id, patch);
    setProfile(updated);
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  function switchDemoRole(role: UserRole) {
    if (!DEMO_MODE) return;
    applyDemoRole(role);
  }

  const value: AuthContextValue = {
    session,
    profile,
    initializing,
    signIn,
    signUpShopper,
    signUpBusiness,
    signOut,
    updateProfile,
    refreshProfile,
    switchDemoRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
