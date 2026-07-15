import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrendingItem } from "../types";
import { useAuth } from "./AuthContext";
import { getFavorites, addFavorite, removeFavorite, syncFavorites } from "../api/social";

const STORAGE_KEY = "nowsee:favorites";

function keyOf(item: Pick<TrendingItem, "id" | "media_type">) {
  return `${item.media_type}-${item.id}`;
}

async function readLocal(): Promise<TrendingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface FavoritesContextValue {
  favorites: TrendingItem[];
  loaded: boolean;
  isFavorite: (item: Pick<TrendingItem, "id" | "media_type">) => boolean;
  toggleFavorite: (item: TrendingItem) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Un solo estado de "Mi Lista" compartido por toda la app (tarjetas, Hero,
 * ficha de detalle, Mi Lista): así tocar el ícono de favorito en una card
 * actualiza al instante cualquier otra card del mismo título en pantalla,
 * en vez de que cada componente tenga su propia copia desincronizada.
 *
 * Sin cuenta: vive solo en este dispositivo (AsyncStorage). Con cuenta:
 * vive en el backend y se sincroniza entre dispositivos — al loguearse
 * por primera vez, lo que había guardado localmente se sube y se fusiona
 * con lo que ya tuviera la cuenta.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<TrendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wasAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    (async () => {
      setLoaded(false);
      try {
        if (isAuthenticated) {
          const justLoggedIn = !wasAuthenticated.current;
          if (justLoggedIn) {
            const local = await readLocal();
            const merged = local.length > 0 ? await syncFavorites(local) : await getFavorites();
            setFavorites(merged);
            await AsyncStorage.removeItem(STORAGE_KEY);
          } else {
            setFavorites(await getFavorites());
          }
        } else {
          setFavorites(await readLocal());
        }
      } catch (e) {
        console.error("Error cargando Mi Lista", e);
      } finally {
        wasAuthenticated.current = isAuthenticated;
        setLoaded(true);
      }
    })();
  }, [isAuthenticated]);

  const isFavorite = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) => favorites.some((f) => keyOf(f) === keyOf(item)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: TrendingItem) => {
      const currentlyFavorite = isFavorite(item);
      const next = currentlyFavorite
        ? favorites.filter((f) => keyOf(f) !== keyOf(item))
        : [item, ...favorites];
      setFavorites(next); // acción inmediata, sin esperar la red

      try {
        if (isAuthenticated) {
          if (currentlyFavorite) await removeFavorite(item.media_type, item.id);
          else await addFavorite(item.media_type, item.id);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error("Error actualizando Mi Lista", e);
        setFavorites(favorites); // revierte el optimistic update si falló
      }
    },
    [favorites, isFavorite, isAuthenticated]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, loaded, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>");
  return ctx;
}
