import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as authApi from "../api/auth";
import { AuthStats, AuthUser } from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  stats: AuthStats | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Logueado Y con el email verificado (habilita las acciones de cuenta). */
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Parameters<typeof authApi.updateProfile>[0]) => Promise<void>;
  resendVerification: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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

  // Espejo síncrono de "¿hay sesión?" para el listener de foco de abajo:
  // el handler se registra una sola vez, así que no puede leer `user`
  // directo (quedaría clavado en el valor inicial null).
  const authedRef = useRef(false);
  useEffect(() => {
    authedRef.current = !!user;
  }, [user]);

  // Si el usuario verifica su email en OTRA pestaña (el link del mail abre
  // una pestaña nueva), esta pestaña seguiría con `emailVerified: null` y
  // las acciones de cuenta quedarían bloqueadas hasta recargar. Al volver
  // el foco / hacerse visible la pestaña, re-pedimos el perfil para que
  // `isVerified` (y las stats) queden al día automáticamente.
  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) return;
    const syncProfile = () => {
      if (!authedRef.current) return;
      authApi
        .getMe()
        .then(({ user, stats }) => {
          setUser(user);
          setStats(stats);
        })
        .catch(() => {
          // sin red / token vencido: no rompemos la sesión acá, el flujo
          // normal de la app ya maneja el 401 cuando corresponde.
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") syncProfile();
    };
    window.addEventListener("focus", syncProfile);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", syncProfile);
      document.removeEventListener("visibilitychange", onVisible);
    };
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

  const resendVerification = useCallback(async () => {
    await authApi.resendVerification();
  }, []);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    setUser(null);
    setStats(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        loading,
        isAuthenticated: !!user,
        isVerified: !!user?.emailVerified,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        resendVerification,
        deleteAccount,
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
