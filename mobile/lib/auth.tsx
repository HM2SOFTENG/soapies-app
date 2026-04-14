import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadTokenFromStorage, clearToken, getMemoryToken, SESSION_COOKIE_KEY } from './trpc';

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

// Validate token synchronously before anything else loads
// A valid JWT has exactly 3 dot-separated parts and is < 300 chars
function isValidJWT(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && token.length < 300 && token.length > 100;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await loadTokenFromStorage();
        if (token && !isValidJWT(token)) {
          console.log('[Auth] Clearing malformed token, length:', token.length);
          await clearToken();
        } else if (token) {
          console.log('[Auth] Valid token on mount, length:', token.length);
        } else {
          console.log('[Auth] No token on mount');
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
