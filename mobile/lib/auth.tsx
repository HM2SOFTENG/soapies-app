import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { SESSION_COOKIE_KEY } from './trpc';

type User = {
  id: number;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  status?: string | null;
  openId?: string;
  emailVerified?: boolean | null;
  avatarUrl?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check for existing session cookie
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const cookie = await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
      if (!cookie) {
        setIsLoading(false);
        return;
      }
      // Cookie exists — actual user data will be fetched via trpc.auth.me in root layout
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }

  function setUser(u: User | null) {
    setUserState(u);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
    setUserState(null);
    // Clear all cached query data so next user gets fresh data
    const { queryClient } = await import('../app/_layout');
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
