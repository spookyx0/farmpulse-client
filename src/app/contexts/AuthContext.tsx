"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Helper to parse token safely
  const getUserFromToken = (token: string): User | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      if (payload.exp * 1000 > Date.now()) {
        return {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          branchId: payload.branchId,
        };
      }
      return null;
    } catch (e) {
      console.error("Token parse error:", e);
      return null;
    }
  };

  const logout = useCallback(() => {
    console.log("Logging out...");
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('token');
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  // Check token on mount
  useEffect(() => {
    const initAuth = () => {
      if (typeof window === 'undefined') return;

      const token = sessionStorage.getItem('token');
      if (token) {
        const userData = getUserFromToken(token);
        if (userData) {
          console.log("Restored user from session:", userData.username);
          setUser(userData);
        } else {
          console.warn("Token expired or invalid during init");
          sessionStorage.removeItem('token');
        }
      } else {
        console.log("No token found in session storage");
      }
      setIsLoading(false);
    };

    initAuth();
  }, []); // Run once on mount

  const login = (token: string) => {
    if (typeof window !== 'undefined') {
      console.log("Login called. Saving token...");
      sessionStorage.setItem('token', token);
      
      // Verify it was saved
      const savedToken = sessionStorage.getItem('token');
      if (!savedToken) {
        alert("Error: Browser failed to save session data. Check browser privacy settings.");
        return;
      }

      const userData = getUserFromToken(token);
      if (userData) {
        setUser(userData);
        console.log("User set. Redirecting to dashboard...");
        router.push('/dashboard');
      } else {
        alert("Login failed: Invalid token received from server.");
      }
    }
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