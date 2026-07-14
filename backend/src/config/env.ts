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
};
