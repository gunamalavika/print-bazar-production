'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AuthenticatedUser } from './api';

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthenticatedUser>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  getRoleDestination: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getRoleDestination(role?: string): string {
  switch (role) {
    case 'ADMIN_MANAGER':
      return '/admin/dashboard';
    case 'OPERATIONAL_MANAGER':
      return '/operations';
    case 'SALES_OFFICE':
      return '/sales/orders';
    case 'DESIGNER_PREPRESS':
      return '/prepress/artwork';
    case 'PRODUCTION_OPERATOR':
      return '/production/queue';
    case 'FINAL_QC_INSPECTOR':
      return '/qc/inspection';
    case 'PACKING_OPERATOR':
      return '/packing/station';
    case 'DISPATCH_LOGISTICS':
      return '/dispatch/manifest';
    case 'ACCOUNTS':
      return '/finance/payments';
    case 'CUSTOMER':
      return '/account';
    default:
      return '/';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Rehydrate session from server
  useEffect(() => {
    async function initAuth() {
      try {
        const savedToken = localStorage.getItem('pb2_token');
        if (savedToken) {
          setToken(savedToken);
          // Verify with server to obtain authoritative role/department
          const me = await api.getCurrentUser();
          setUser(me);
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing local session');
        localStorage.removeItem('pb2_token');
        localStorage.removeItem('pb2_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthenticatedUser> => {
    const res = await api.login({ identifier, password });
    
    // Server is the sole authority for role and department
    setToken(res.accessToken);
    setUser(res.user);

    localStorage.setItem('pb2_token', res.accessToken);
    localStorage.setItem('pb2_user', JSON.stringify(res.user));

    return res.user;
  };

  const register = async (data: { email: string; password: string; fullName: string; phone?: string }): Promise<AuthenticatedUser> => {
    const res = await api.register(data);

    setToken(res.accessToken);
    setUser(res.user);

    localStorage.setItem('pb2_token', res.accessToken);
    localStorage.setItem('pb2_user', JSON.stringify(res.user));

    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('pb2_token');
      localStorage.removeItem('pb2_user');
      setToken(null);
      setUser(null);
      // All users navigate to the home page upon signing out
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        getRoleDestination,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
