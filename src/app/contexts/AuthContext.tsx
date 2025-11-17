"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// 1. Define the shape of the user and context
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
}

// 2. Create the Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// FIX: Create an initializer function
// This function will run ONCE to get the initial state
const getInitialUser = (): User | null => {
  const token = Cookies.get('token');
  if (token) {
    try {
      // Decode the token
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        // Token is valid
        return {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          branchId: payload.branchId,
        };
      } else {
        // Token expired
        Cookies.remove('token');
      }
    } catch (error) {
      // Invalid token
      Cookies.remove('token');
    }
  }
  return null;
};

// 3. Create the Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // FIX: Use the initializer function. This runs only on the first render.
  const [user, setUser] = useState<User | null>(getInitialUser);
  const router = useRouter();

  // The logout function is still needed for the button/login
  const logout = useCallback(() => {
    Cookies.remove('token');
    setUser(null);
    router.push('/login');
  }, [router]);

  // The useEffect for checking the token is no longer needed
  // because useState(getInitialUser) already handled it.

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
      value={{ user, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};