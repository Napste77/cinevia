/**
 * Metadata de plataformas de streaming usada SOLO para armar la
 * navegación del Home (label + a qué provider de TMDB corresponde, para
 * pedirle a la API propia /discover?provider=...). La resolución real de
 * deep links, colores de marca y logos vive en el backend (ver
 * backend/src/data/platforms.ts) y llega ya resuelta en cada respuesta.
 */
export interface StreamingPlatformDef {
  key: string;
  label: string;
  /** ID de provider de TMDB (para pedirle a la API propia /discover?provider=...). */
  providerId: number;
}

export const STREAMING_PLATFORMS: StreamingPlatformDef[] = [
  { key: "netflix", label: "Netflix", providerId: 8 },
  { key: "disney", label: "Disney+", providerId: 337 },
  { key: "prime", label: "Prime Video", providerId: 119 },
  { key: "max", label: "Max", providerId: 1899 },
  { key: "apple", label: "Apple TV+", providerId: 350 },
  { key: "paramount", label: "Paramount+", providerId: 531 },
  { key: "hulu", label: "Hulu", providerId: 15 },
  { key: "crunchyroll", label: "Crunchyroll", providerId: 283 },
];
