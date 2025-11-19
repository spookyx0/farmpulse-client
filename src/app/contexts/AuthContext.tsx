"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// 1. Define Types
interface User {
  id: number;
  username: string;
  role: 'OWNER' | 'STAFF' | 'FREEZER_VAN' | 'LIVE_CHICKEN';
  branchId: number | null;
}

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // We export this so Layout can wait
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true to prevent hydration mismatch
  const router = useRouter();

  const logout = useCallback(() => {
    Cookies.remove('token');
    setUser(null);
    router.push('/login');
  }, [router]);

  // Check token purely on the client side to avoid Hydration Mismatch
  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          // Check expiry
          if (payload.exp * 1000 > Date.now()) {
            setUser({
              id: payload.sub,
              username: payload.username,
              role: payload.role,
              branchId: payload.branchId,
            });
          } else {
            logout();
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          logout();
        }
      }
      setIsLoading(false); // Loading finished (whether found or not)
    };

    checkAuth();
  }, [logout]);

  const login = (token: string) => {
    Cookies.set('token', token, { expires: 1 });
    const payload = JSON.parse(atob(token.split('.')[1]));
    setUser({
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      branchId: payload.branchId,
    });
    router.push('/dashboard');
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading }}
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