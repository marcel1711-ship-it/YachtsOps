import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { demoUsers } from '../data/demoData';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  user: any;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  selectedVesselId: string | null;
  setSelectedVesselId: (vesselId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const storedUser = localStorage.getItem('currentUser');
    const storedVesselId = localStorage.getItem('selectedVesselId');

    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);

      if (storedVesselId) {
        setSelectedVesselId(storedVesselId);
      } else if (user.vessel_ids.length > 0) {
        setSelectedVesselId(user.vessel_ids[0]);
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();

    const demoUser = demoUsers.find(u => u.email === normalizedEmail && u.status === 'active');
    if (demoUser && password === 'demo123') {
      try {
        const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (authError && authError.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { data: { role: demoUser.role } },
          });
          if (!signUpError) setUser(signUpData?.user ?? null);
        } else if (!authError) {
          setUser(signInData?.user ?? null);
        }
      } catch (error) {
        console.error('Supabase auth error:', error);
      }

      setCurrentUser(demoUser);
      localStorage.setItem('currentUser', JSON.stringify(demoUser));

      if (demoUser.vessel_ids.length > 0 && demoUser.role !== 'master_admin') {
        setSelectedVesselId(demoUser.vessel_ids[0]);
        localStorage.setItem('selectedVesselId', demoUser.vessel_ids[0]);
      }

      return true;
    }

    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !signInData.user) return false;

    const supabaseUser = signInData.user;
    const meta = supabaseUser.user_metadata;
    const companyId = meta?.company_id || '';
    const role = meta?.role || 'standard_user';

    let vesselIds: string[] = meta?.vessel_ids || [];

    if (companyId && vesselIds.length === 0) {
      const { data: vessels } = await supabase
        .from('vessels')
        .select('id')
        .eq('company_id', companyId);
      if (vessels) vesselIds = vessels.map((v: { id: string }) => v.id);
    }

    const realUser: User = {
      id: supabaseUser.id,
      company_id: companyId,
      email: supabaseUser.email || normalizedEmail,
      full_name: meta?.full_name || supabaseUser.email || '',
      phone: meta?.phone || '',
      role,
      status: 'active',
      vessel_ids: vesselIds,
      created_at: supabaseUser.created_at,
    };

    setUser(supabaseUser);
    setCurrentUser(realUser);
    localStorage.setItem('currentUser', JSON.stringify(realUser));

    if (vesselIds.length > 0 && role !== 'master_admin') {
      const stored = localStorage.getItem('selectedVesselId');
      if (!stored) {
        setSelectedVesselId(vesselIds[0]);
        localStorage.setItem('selectedVesselId', vesselIds[0]);
      }
    }

    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUser(null);
    setSelectedVesselId(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedVesselId');
  };

  const handleSetSelectedVesselId = (vesselId: string) => {
    setSelectedVesselId(vesselId);
    localStorage.setItem('selectedVesselId', vesselId);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user,
        login,
        logout,
        isAuthenticated: !!currentUser,
        selectedVesselId,
        setSelectedVesselId: handleSetSelectedVesselId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
