/**
 * Países soportados para selector de región + detección por IP. Lista
 * corta e intencional (los mercados donde operan las plataformas que ya
 * tenemos curadas en platforms.ts) — se amplía agregando filas acá, sin
 * tocar el resto del sistema.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "MX", name: "México" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "UY", name: "Uruguay" },
];

/**
 * Qué plataforma (slug de platforms.ts) opera en qué país (code de
 * arriba). Referencia pública de catálogo por región (no depende de TMDB).
 */
export const PLATFORM_AVAILABILITY: Record<string, string[]> = {
  netflix: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  disney: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  prime: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  max: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  apple: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  paramount: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
  hulu: ["US"],
  crunchyroll: ["AR", "ES", "US", "MX", "BR", "CL", "CO", "UY"],
};
