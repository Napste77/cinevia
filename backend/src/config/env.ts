import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  tmdbBaseUrl: process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3",
  defaultCountry: process.env.DEFAULT_COUNTRY || "AR",
  syncSecret: required("SYNC_SECRET", "dev_sync_secret_change_me"),
  enableInternalCron: process.env.ENABLE_INTERNAL_CRON === "true",

  jwtSecret: required("JWT_SECRET", "dev_jwt_secret_change_me"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),

  // OAuth: arquitectura preparada (ver src/services/auth.ts), pero sin
  // credenciales configuradas todavía se responde 501 en vez de simular
  // un login que no es real.
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  appleClientId: process.env.APPLE_CLIENT_ID || "",

  // Proveedor de geolocalización por IP (ver src/providers/geoip.ts).
  // ip-api.com: gratis, sin API key, HTTP only (alcanza para uso server-side).
  geoIpBaseUrl: process.env.GEOIP_BASE_URL || "http://ip-api.com/json",
};
