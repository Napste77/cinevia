// Mi Lista ahora es un estado compartido por toda la app (ver
// src/context/FavoritesContext.tsx) — este archivo queda solo como
// re-export para no tener que tocar el import en cada pantalla.
export { useFavorites } from "../context/FavoritesContext";
