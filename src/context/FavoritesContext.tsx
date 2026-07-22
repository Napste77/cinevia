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

  // Espejo síncrono del estado, además del useState de arriba (que solo
  // sirve para pintar la UI). Tocar varias cards distintas rápido dispara
  // varios toggleFavorite() antes de que React vuelva a renderizar --con
  // useState solo, cada toggle calculaba el "próximo estado" a partir del
  // mismo `favorites` viejo (el de la última vez que este componente
  // renderizó), así que el segundo toggle pisaba por completo el cambio
  // del primero en vez de sumarse (eso era el "se van destildando" al ir
  // tocando varias películas seguidas). Este ref se actualiza en el acto,
  // así el siguiente toggle -aunque sea en el mismo tick- parte siempre
  // del estado real más reciente.
  const favoritesRef = useRef<TrendingItem[]>([]);

  const applyFavorites = useCallback((next: TrendingItem[]) => {
    favoritesRef.current = next;
    setFavorites(next);
  }, []);

  useEffect(() => {
    (async () => {
      setLoaded(false);
      try {
        if (isAuthenticated) {
          const justLoggedIn = !wasAuthenticated.current;
          if (justLoggedIn) {
            const local = await readLocal();
            const merged = local.length > 0 ? await syncFavorites(local) : await getFavorites();
            applyFavorites(merged);
            await AsyncStorage.removeItem(STORAGE_KEY);
          } else {
            applyFavorites(await getFavorites());
          }
        } else {
          applyFavorites(await readLocal());
        }
      } catch (e) {
        console.error("Error cargando Mi Lista", e);
      } finally {
        wasAuthenticated.current = isAuthenticated;
        setLoaded(true);
      }
    })();
  }, [isAuthenticated, applyFavorites]);

  const isFavorite = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) => favorites.some((f) => keyOf(f) === keyOf(item)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: TrendingItem) => {
      const key = keyOf(item);
      const current = favoritesRef.current;
      const wasFavorite = current.some((f) => keyOf(f) === key);
      const next = wasFavorite ? current.filter((f) => keyOf(f) !== key) : [item, ...current];
      applyFavorites(next); // acción inmediata, sin esperar la red

      try {
        if (isAuthenticated) {
          if (wasFavorite) await removeFavorite(item.media_type, item.id);
          else await addFavorite(item.media_type, item.id);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error("Error actualizando Mi Lista", e);
        // Revierte solo el cambio de ESTE toggle sobre el estado actual
        // (que puede haber seguido cambiando por otros toggles mientras
        // esta request estaba en vuelo), no pisa todo con una foto vieja.
        const afterFailure = favoritesRef.current;
        const stillApplied = afterFailure.some((f) => keyOf(f) === key) !== wasFavorite;
        if (stillApplied) {
          const reverted = wasFavorite
            ? [item, ...afterFailure.filter((f) => keyOf(f) !== key)]
            : afterFailure.filter((f) => keyOf(f) !== key);
          applyFavorites(reverted);
        }
      }
    },
    [isAuthenticated, applyFavorites]
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
