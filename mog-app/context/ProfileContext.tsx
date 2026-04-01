import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { createContext, useContext, useEffect, useState } from 'react';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            id: data.id,
            heightCm: data.height_cm ?? null,
            weightKg: data.weight_kg ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
          });
        }
        setLoading(false);
      });
  }, [user?.id]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id'>>) => {
    if (!user) return;

    const dbRow: Record<string, unknown> = {
      id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (updates.heightCm !== undefined) dbRow.height_cm = updates.heightCm;
    if (updates.weightKg !== undefined) dbRow.weight_kg = updates.weightKg;
    if (updates.city !== undefined) dbRow.city = updates.city;
    if (updates.state !== undefined) dbRow.state = updates.state;
    if (updates.latitude !== undefined) dbRow.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbRow.longitude = updates.longitude;

    const { error } = await supabase.from('profiles').upsert(dbRow);
    if (!error) {
      setProfile(prev => ({
        id: user.id,
        heightCm: null,
        weightKg: null,
        city: null,
        state: null,
        latitude: null,
        longitude: null,
        ...prev,
        ...updates,
      }));
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
