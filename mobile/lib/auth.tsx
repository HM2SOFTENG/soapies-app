import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadTokenFromStorage, clearToken, SESSION_COOKIE_KEY } from './trpc';

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
  hasToken: boolean;           // reactive — triggers re-render when token changes
  setUser: (user: User | null) => void;
  setHasToken: (val: boolean) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  hasToken: false,
  setUser: () => {},
  setHasToken: () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function isValidJWT(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && token.length < 300 && token.length > 100;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Nuke ALL possible stale token keys from previous app versions
        const SecureStore = await import('expo-secure-store');
        const allKeys = [
          'app_session_cookie',   // current key
          'app_session_id',       // old key variant
          'session_token',        // old key variant
          'sessionToken',         // old key variant
          'SESSION_COOKIE',       // old key variant
        ];
        
        // Read current key first
        const token = await SecureStore.getItemAsync('app_session_cookie').catch(() => null);
        
        // Clear all old/stale keys regardless
        for (const key of allKeys.filter(k => k !== 'app_session_cookie')) {
          await SecureStore.deleteItemAsync(key).catch(() => {});
        }

        if (token && !isValidJWT(token)) {
          // console.log('[Auth] Clearing malformed token, length:', token.length);
          await clearToken();
          setHasToken(false);
        } else if (token) {
          // Load valid token into memory
          const { setMemoryToken } = await import('./trpc');
          setMemoryToken(token);
          // console.log('[Auth] Valid token on mount, length:', token.length);
          setHasToken(true);
        } else {
          // console.log('[Auth] No token on mount');
          setHasToken(false);
        }
      } catch (e) {
        console.warn('[Auth] mount check error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function setUser(u: User | null) {
    setUserState(u);
  }

  async function logout() {
    await clearToken();
    setUserState(null);
    setHasToken(false);         // triggers re-render — disables all queries immediately
    try {
      const { queryClient } = await import('../app/_layout');
      queryClient.clear();
    } catch (e) {
      // console.log('[auth] queryClient clear skip:', e);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, hasToken, setUser, setHasToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
