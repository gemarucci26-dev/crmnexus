import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexus-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state) {
          setUserState(parsed.state.user);
          setToken(parsed.state.token);
          setIsAuthenticated(parsed.state.isAuthenticated);
        }
      }
    } catch {}
    setIsHydrated(true);
    setTimeout(() => setIsHydrated(true), 0);
  }, []);

  const login = (userData: User, tokenData: string) => {
    setUserState(userData);
    setToken(tokenData);
    setIsAuthenticated(true);
    localStorage.setItem('nexus-auth', JSON.stringify({ state: { user: userData, token: tokenData, isAuthenticated: true } }));
  };

  const logout = () => {
    setUserState(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('nexus-auth');
  };

  const setUser = (userData: User) => {
    setUserState(userData);
    const currentToken = token;
    localStorage.setItem('nexus-auth', JSON.stringify({ state: { user: userData, token: currentToken, isAuthenticated: true } }));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isHydrated, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
