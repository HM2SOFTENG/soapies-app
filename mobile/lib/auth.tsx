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

  useEffect(() => {
    // Validate stored token on mount — clear it if it looks malformed
    SecureStore.getItemAsync(SESSION_COOKIE_KEY)
      .then(async (token) => {
        if (token) {
          // A valid JWT has exactly 3 dot-separated parts and is ~196 chars
          const parts = token.split('.');
          const isValidJWT = parts.length === 3 && token.length < 300;
          if (!isValidJWT) {
            console.log('[Auth] Clearing malformed token, length:', token.length, 'parts:', parts.length);
            await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
          } else {
            console.log('[Auth] Token looks valid, length:', token.length);
          }
        }
      })
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, []);

  function setUser(u: User | null) {
    setUserState(u);
  }

  async function logout() {
    // 1. Clear stored token
    await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY).catch(() => {});
    // 2. Clear user state
    setUserState(null);
    // 3. Clear all query cache (lazy import to avoid circular dep)
    try {
      const { queryClient } = await import('../app/_layout');
      queryClient.clear();
    } catch (e) {
      console.log('[auth] queryClient clear skip:', e);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
