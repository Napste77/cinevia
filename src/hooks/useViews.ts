// "Ya lo vi" es un estado compartido por toda la app (ver
// src/context/ViewsContext.tsx) — este archivo queda solo como re-export
// para no tener que tocar el import en cada pantalla.
export { useViews } from "../context/ViewsContext";
