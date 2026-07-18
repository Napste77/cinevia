import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { detectRegion } from "../api/geo";
import { useAuth } from "./AuthContext";
import { DEFAULT_COUNTRY } from "../config/catalog";

const REGION_STORAGE_KEY = "nowsee:region";
const FALLBACK_COUNTRY = DEFAULT_COUNTRY;

interface RegionContextValue {
  /** Región activa: toda la app (discover, providers, fichas) la usa como país por defecto. */
  country: string;
  loaded: boolean;
  /** Cambio manual desde el perfil — actualiza toda la app al instante, sin recargar. */
  setCountry: (code: string) => Promise<void>;
}

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [country, setCountryState] = useState(FALLBACK_COUNTRY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      // La cuenta ya tiene una región guardada (se cambió manualmente antes,
      // en este u otro dispositivo): esa manda por sobre cualquier otra cosa.
      if (isAuthenticated && user?.country) {
        setCountryState(user.country);
        setLoaded(true);
        return;
      }

      const stored = await AsyncStorage.getItem(REGION_STORAGE_KEY);
      if (stored) {
        setCountryState(stored);
        setLoaded(true);
        return;
      }

      // Primera visita, sin región guardada en ningún lado: detectar por IP
      // (nunca pide permiso de geolocalización GPS).
      try {
        const detected = await detectRegion();
        setCountryState(detected);
        await AsyncStorage.setItem(REGION_STORAGE_KEY, detected);
      } catch {
        // Se queda con FALLBACK_COUNTRY si la detección falla.
      } finally {
        setLoaded(true);
      }
    })();
  }, [isAuthenticated, user?.country]);

  const setCountry = useCallback(
    async (code: string) => {
      setCountryState(code);
      await AsyncStorage.setItem(REGION_STORAGE_KEY, code);
      if (isAuthenticated) {
        // Persiste en la cuenta: se sincroniza entre dispositivos la
        // próxima vez que el usuario inicie sesión en otro lado.
        await updateProfile({ country: code });
      }
    },
    [isAuthenticated, updateProfile]
  );

  return <RegionContext.Provider value={{ country, loaded, setCountry }}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion debe usarse dentro de <RegionProvider>");
  return ctx;
}
