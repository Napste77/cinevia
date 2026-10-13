/**
 * Países soportados para selector de región + detección por IP.
 *
 * Ampliar es tan simple como agregar una fila acá: el endpoint /countries
 * lee esta constante directo, la detección por IP solo acepta códigos de
 * esta lista, y el catálogo de cada país se completa solo — los servicios
 * de movies/tv resuelven el contenido en vivo contra TMDB por `watchRegion`
 * (el código de país) y lo cachean en la DB la primera vez que alguien
 * entra con esa región. No hace falta re-seedear para sumar un país.
 *
 * Orden: Argentina primero (mercado por defecto), después el resto de
 * Latinoamérica hispanohablante, luego España/EE.UU. y otros mercados
 * grandes donde operan las plataformas que curamos.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "BO", name: "Bolivia" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "EC", name: "Ecuador" },
  { code: "SV", name: "El Salvador" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Perú" },
  { code: "PR", name: "Puerto Rico" },
  { code: "DO", name: "República Dominicana" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "BR", name: "Brasil" },
  { code: "PT", name: "Portugal" },
  { code: "CA", name: "Canadá" },
  { code: "GB", name: "Reino Unido" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "AU", name: "Australia" },
];

const ALL_COUNTRY_CODES = COUNTRIES.map((c) => c.code);

/**
 * Qué plataforma (slug de platforms.ts) opera en qué país (code de arriba).
 * Referencia pública de catálogo por región (no depende de TMDB).
 *
 * Las plataformas globales se marcan disponibles en todos los países de la
 * lista (se deriva de COUNTRIES para no repetir arrays ni que se desfasen
 * al sumar un país). Si una plataforma no tiene catálogo real en algún
 * mercado, la fila queda vacía con su mensaje de "sin catálogo" — no rompe
 * nada. Hulu es la única excepción: solo opera en EE.UU.
 */
export const PLATFORM_AVAILABILITY: Record<string, string[]> = {
  netflix: ALL_COUNTRY_CODES,
  disney: ALL_COUNTRY_CODES,
  prime: ALL_COUNTRY_CODES,
  max: ALL_COUNTRY_CODES,
  apple: ALL_COUNTRY_CODES,
  paramount: ALL_COUNTRY_CODES,
  crunchyroll: ALL_COUNTRY_CODES,
  hulu: ["US"],
};
