import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TrendingItem } from "../types";
import { useAuth } from "./AuthContext";
import { getFavorites, addFavorite, removeFavorite } from "../api/social";

function keyOf(item: Pick<TrendingItem, "id" | "media_type">) {
  return `${item.media_type}-${item.id}`;
}

interface FavoritesContextValue {
  favorites: TrendingItem[];
  loaded: boolean;
  isFavorite: (item: Pick<TrendingItem, "id" | "media_type">) => boolean;
  toggleFavorite: (item: TrendingItem) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * "Mi Lista" es una funcionalidad SOLO de cuenta: vive en el backend y se
 * sincroniza entre dispositivos. Un invitado no tiene lista (la UI lo manda
 * a crear cuenta antes de poder agregar nada), así que acá `favorites`
 * queda vacío cuando no hay sesión — nada se guarda localmente ni queda
 * "pegado" al desloguearse.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<TrendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Espejo síncrono del estado (ver nota larga más abajo en toggleFavorite):
  // tocar varias cards rápido dispara varios toggle antes de un re-render, y
  // sin este ref cada uno partiría del `favorites` viejo y se pisarían.
  const favoritesRef = useRef<TrendingItem[]>([]);

  const applyFavorites = useCallback((next: TrendingItem[]) => {
    favoritesRef.current = next;
    setFavorites(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      // Sin sesión: no hay lista. Se limpia (ej. al desloguearse) para que
      // no queden marcados los títulos que se habían agregado con cuenta.
      if (!isAuthenticated) {
        applyFavorites([]);
        setLoaded(true);
        return;
      }
      try {
        const rows = await getFavorites();
        if (!cancelled) applyFavorites(rows);
      } catch (e) {
        console.error("Error cargando Mi Lista", e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyFavorites]);

  const isFavorite = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) => favorites.some((f) => keyOf(f) === keyOf(item)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: TrendingItem) => {
      // Guardarraíl: Mi Lista es solo de cuenta. La UI ya evita llegar acá
      // sin sesión (manda a login/verificación), pero si algo lo llama igual,
      // no hacemos nada en vez de guardar un estado local fantasma.
      if (!isAuthenticated) return;

      const key = keyOf(item);
      const current = favoritesRef.current;
      const wasFavorite = current.some((f) => keyOf(f) === key);
      const next = wasFavorite ? current.filter((f) => keyOf(f) !== key) : [item, ...current];
      applyFavorites(next); // acción inmediata, sin esperar la red

      try {
        if (wasFavorite) await removeFavorite(item.media_type, item.id);
        else await addFavorite(item.media_type, item.id);
      } catch (e) {
        console.error("Error actualizando Mi Lista", e);
        // Revierte solo el cambio de ESTE toggle sobre el estado actual (que
        // pudo seguir cambiando por otros toggles en vuelo), sin pisar todo.
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
