'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AuthenticatedUser } from './api';

export interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRole: string | null;
  switchActiveRole: (role: string) => void;
  login: (identifier: string, password: string) => Promise<AuthenticatedUser>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<AuthenticatedUser>;
  logout: () => Promise<void>;
  getRoleDestination: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichUserWithRoles(userData: AuthenticatedUser | null): AuthenticatedUser | null {
  if (!userData) return null;
  let userRoles = Array.isArray(userData.roles) && userData.roles.length > 0 ? [...userData.roles] : [];
  if (userRoles.length === 0 && typeof window !== 'undefined') {
    try {
      const savedRoster = localStorage.getItem('printbazzar_staff_roster_v3');
      if (savedRoster) {
        const parsed = JSON.parse(savedRoster);
        if (Array.isArray(parsed)) {
          const matched = parsed.find(
            (p: any) => p.email?.toLowerCase() === userData.email?.toLowerCase() || p.id === userData.id
          );
          if (matched && Array.isArray(matched.roles) && matched.roles.length > 0) {
            userRoles = matched.roles;
          }
        }
      }
    } catch {}
  }
  if (userRoles.length === 0 && userData.role) {
    userRoles = [userData.role];
  }
  return {
    ...userData,
    roles: userRoles,
  };
}

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
  const [activeRole, setActiveRole] = useState<string | null>(null);

  const switchActiveRole = (newRole: string) => {
    setActiveRole(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pb2_active_role', newRole);
    }
  };

  // Rehydrate session from server
  useEffect(() => {
    async function initAuth() {
      try {
        const savedToken = localStorage.getItem('pb2_token');
        if (savedToken) {
          setToken(savedToken);
          // Verify with server to obtain authoritative role/department
          const me = await api.getCurrentUser();
          const enriched = enrichUserWithRoles(me);
          setUser(enriched);

          const savedActiveRole = localStorage.getItem('pb2_active_role');
          if (savedActiveRole && enriched?.roles?.includes(savedActiveRole)) {
            setActiveRole(savedActiveRole);
          } else {
            setActiveRole(enriched?.role || (enriched?.roles && enriched.roles[0]) || null);
          }
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing local session');
        localStorage.removeItem('pb2_token');
        localStorage.removeItem('pb2_user');
        localStorage.removeItem('pb2_active_role');
        setToken(null);
        setUser(null);
        setActiveRole(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthenticatedUser> => {
    const res = await api.login({ identifier, password });
    
    // Server is the sole authority for role and department
    const enriched = enrichUserWithRoles(res.user);
    setToken(res.accessToken);
    setUser(enriched);
    const initialRole = enriched?.role || (enriched?.roles && enriched.roles[0]) || null;
    setActiveRole(initialRole);
    if (initialRole) {
      localStorage.setItem('pb2_active_role', initialRole);
    }

    localStorage.setItem('pb2_token', res.accessToken);
    localStorage.setItem('pb2_user', JSON.stringify(enriched));

    return enriched || res.user;
  };

  const register = async (data: { email: string; password: string; fullName: string; phone?: string }): Promise<AuthenticatedUser> => {
    const res = await api.register(data);

    const enriched = enrichUserWithRoles(res.user);
    setToken(res.accessToken);
    setUser(enriched);
    const initialRole = enriched?.role || (enriched?.roles && enriched.roles[0]) || null;
    setActiveRole(initialRole);
    if (initialRole) {
      localStorage.setItem('pb2_active_role', initialRole);
    }

    localStorage.setItem('pb2_token', res.accessToken);
    localStorage.setItem('pb2_user', JSON.stringify(enriched));

    return enriched || res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('pb2_token');
      localStorage.removeItem('pb2_user');
      localStorage.removeItem('pb2_active_role');
      setToken(null);
      setUser(null);
      setActiveRole(null);
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
        activeRole,
        switchActiveRole,
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
