import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import { AuthStats, AuthUser } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  stats: AuthStats | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Parameters<typeof authApi.updateProfile>[0]) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const restored = await authApi.restoreSession();
      setUser(restored);
      if (restored) {
        try {
          const { stats } = await authApi.getMe();
          setStats(stats);
        } catch {
          // no bloquea el arranque de la app por esto
        }
      }
      setLoading(false);
    })();
  }, []);

  const refreshProfile = useCallback(async () => {
    const { user, stats } = await authApi.getMe();
    setUser(user);
    setStats(stats);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedUser = await authApi.login(email, password);
    setUser(loggedUser);
    await refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const newUser = await authApi.register(email, password, name);
    setUser(newUser);
    await refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStats(null);
  }, []);

  const updateProfile = useCallback(async (patch: Parameters<typeof authApi.updateProfile>[0]) => {
    const updated = await authApi.updateProfile(patch);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
