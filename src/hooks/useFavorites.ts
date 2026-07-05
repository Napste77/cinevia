import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrendingItem } from "../types";

const STORAGE_KEY = "cinevia:favorites";

function keyOf(item: Pick<TrendingItem, "id" | "media_type">) {
  return `${item.media_type}-${item.id}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<TrendingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setFavorites(JSON.parse(raw));
      } catch (e) {
        console.error("Error cargando Mi Lista", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: TrendingItem[]) => {
    setFavorites(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Error guardando Mi Lista", e);
    }
  }, []);

  const isFavorite = useCallback(
    (item: Pick<TrendingItem, "id" | "media_type">) =>
      favorites.some((f) => keyOf(f) === keyOf(item)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (item: TrendingItem) => {
      if (isFavorite(item)) {
        persist(favorites.filter((f) => keyOf(f) !== keyOf(item)));
      } else {
        persist([item, ...favorites]);
      }
    },
    [favorites, isFavorite, persist]
  );

  return { favorites, loaded, isFavorite, toggleFavorite };
}
