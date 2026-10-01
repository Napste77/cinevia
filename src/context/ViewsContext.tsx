import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TrendingItem } from "../types";
import { useAuth } from "./AuthContext";
import { getViews, markViewed, unmarkViewed } from "../api/social";

function keyOf(item: Pick<TrendingItem, "id" | "media_type">) {
  return `${item.media_type}-${item.id}`;
}

interface ViewsContextValue {
  views: TrendingItem[];
  loaded: boolean;
  isViewed: (item: Pick<TrendingItem, "id" | "media_type">) => boolean;
  toggleViewed: (item: TrendingItem) => Promise<void>;
}

const ViewsContext = createContext<ViewsContextValue | null>(null);

/**
 * "Ya lo vi": igual que FavoritesContext, es SOLO de cuenta. Sin sesión no
 * hay marcas (la UI manda a crear cuenta antes), así que `views` queda
 * vacío cuando no hay usuario — nada local ni "pegado" al desloguearse.
 */
export function ViewsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [views, setViews] = useState<TrendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Ver el comentario equivalente en FavoritesContext.tsx (ref síncrono que
  // evita que toggles rápidos y seguidos se pisen entre sí).
  const viewsRef = useRef<TrendingItem[]>([]);

  const applyViews = useCallback((next: TrendingItem[]) => {
    viewsRef.current = next;
    setViews(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      if (!isAuthenticated) {
        applyViews([]);
        setLoaded(true);
        return;
      }
      try {
        const rows = await getViews();
        if (!cancelled) applyViews(rows);
      } catch (e) {
        console.error("Error cargando Ya lo vi", e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyViews]);

  const isViewed = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) => views.some((v) => keyOf(v) === keyOf(item)),
    [views]
  );

  const toggleViewed = useCallback(
    async (item: TrendingItem) => {
      if (!isAuthenticated) return; // guardarraíl: solo con cuenta

      const key = keyOf(item);
      const current = viewsRef.current;
      const wasViewed = current.some((v) => keyOf(v) === key);
      const next = wasViewed ? current.filter((v) => keyOf(v) !== key) : [item, ...current];
      applyViews(next); // acción inmediata, sin esperar la red

      try {
        if (wasViewed) await unmarkViewed(item.media_type, item.id);
        else await markViewed(item.media_type, item.id);
      } catch (e) {
        console.error("Error actualizando Ya lo vi", e);
        const afterFailure = viewsRef.current;
        const stillApplied = afterFailure.some((v) => keyOf(v) === key) !== wasViewed;
        if (stillApplied) {
          const reverted = wasViewed
            ? [item, ...afterFailure.filter((v) => keyOf(v) !== key)]
            : afterFailure.filter((v) => keyOf(v) !== key);
          applyViews(reverted);
        }
      }
    },
    [isAuthenticated, applyViews]
  );

  return (
    <ViewsContext.Provider value={{ views, loaded, isViewed, toggleViewed }}>
      {children}
    </ViewsContext.Provider>
  );
}

export function useViews() {
  const ctx = useContext(ViewsContext);
  if (!ctx) throw new Error("useViews debe usarse dentro de <ViewsProvider>");
  return ctx;
}
