import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrendingItem } from "../types";
import { useAuth } from "./AuthContext";
import { getViews, markViewed, unmarkViewed, syncViews } from "../api/social";

const STORAGE_KEY = "nowsee:views";

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

interface ViewsContextValue {
  views: TrendingItem[];
  loaded: boolean;
  isViewed: (item: Pick<TrendingItem, "id" | "media_type">) => boolean;
  toggleViewed: (item: TrendingItem) => Promise<void>;
}

const ViewsContext = createContext<ViewsContextValue | null>(null);

/**
 * "Ya lo vi": mismo patrón que FavoritesContext — estado compartido por
 * toda la app, con marca manual independiente de la que deja abrir una
 * ficha (esa sigue siendo automática, ver backend/src/services/detail.ts).
 * Sin cuenta vive en el dispositivo (AsyncStorage); con cuenta se
 * sincroniza al backend y se fusiona al loguearse.
 */
export function ViewsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [views, setViews] = useState<TrendingItem[]>([]);
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
            const merged = local.length > 0 ? await syncViews(local) : await getViews();
            setViews(merged);
            await AsyncStorage.removeItem(STORAGE_KEY);
          } else {
            setViews(await getViews());
          }
        } else {
          setViews(await readLocal());
        }
      } catch (e) {
        console.error("Error cargando Ya lo vi", e);
      } finally {
        wasAuthenticated.current = isAuthenticated;
        setLoaded(true);
      }
    })();
  }, [isAuthenticated]);

  const isViewed = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) => views.some((v) => keyOf(v) === keyOf(item)),
    [views]
  );

  const toggleViewed = useCallback(
    async (item: TrendingItem) => {
      const currentlyViewed = isViewed(item);
      const next = currentlyViewed
        ? views.filter((v) => keyOf(v) !== keyOf(item))
        : [item, ...views];
      setViews(next); // acción inmediata, sin esperar la red

      try {
        if (isAuthenticated) {
          if (currentlyViewed) await unmarkViewed(item.media_type, item.id);
          else await markViewed(item.media_type, item.id);
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch (e) {
        console.error("Error actualizando Ya lo vi", e);
        setViews(views); // revierte el optimistic update si falló
      }
    },
    [views, isViewed, isAuthenticated]
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
