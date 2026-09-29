import { Router } from "express";
import mysql from "mysql2/promise";
import { requireSyncSecret } from "../middleware/internalAuth";
import { prisma } from "../db/prisma";

/**
 * TEMPORAL — migración one-off de la MySQL de Aiven a Postgres de
 * Supabase (ver HANDOFF.md, sección de la migración Vercel/Supabase). Se
 * borra este archivo (y su registro en app.ts) apenas termina la
 * migración: no es algo que deba quedar vivo en producción.
 *
 * A diferencia de la migración anterior (Hostinger MySQL -> Aiven MySQL,
 * mismo motor), esta cruza de motor: no se puede resolver con dos
 * PrismaClient del mismo schema apuntando a URLs distintas, porque el
 * schema.prisma de este proyecto ahora es 100% Postgres. Se lee el
 * origen (Aiven) con `mysql2` en crudo y se escribe el destino (Supabase)
 * con el Prisma Client normal de la app (ya apunta a Postgres vía
 * DATABASE_URL/DIRECT_DATABASE_URL).
 *
 * Requiere la env var SOURCE_MYSQL_URL apuntando a Aiven, seteada solo
 * mientras dura la migración (formato: mysql://user:pass@host:puerto/db).
 */
export const migrateRouter = Router();

// Orden que respeta FKs: primero lo que no depende de nada, último lo que
// depende de todo lo anterior.
const TABLE_PLAN: { table: string; model: string; booleanFields?: string[] }[] = [
  { table: "countries", model: "country" },
  { table: "genres", model: "genre" },
  { table: "platforms", model: "platform" },
  { table: "platform_availability", model: "platformAvailability" },
  { table: "movies", model: "movie" },
  { table: "tv_shows", model: "tVShow" },
  { table: "movie_genres", model: "movieGenre" },
  { table: "tv_genres", model: "tVGenre" },
  { table: "cast_members", model: "cast" },
  { table: "content_cast", model: "contentCast" },
  { table: "streaming_links", model: "streamingLink", booleanFields: ["verified"] },
  { table: "videos", model: "video", booleanFields: ["official"] },
  { table: "images", model: "image" },
  { table: "similar_content", model: "similarContent" },
  { table: "users", model: "user", booleanFields: ["notify_new_releases", "notify_comments"] },
  { table: "user_sessions", model: "userSession" },
  { table: "password_reset_tokens", model: "passwordResetToken" },
  { table: "user_regions", model: "userRegion" },
  { table: "user_ratings", model: "userRating" },
  { table: "user_comments", model: "userComment", booleanFields: ["reported"] },
  { table: "user_favorites", model: "userFavorite" },
  { table: "user_lists", model: "userList" },
  { table: "user_list_items", model: "userListItem" },
  { table: "user_views", model: "userView" },
];

function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/** search_vector es una columna generada en Postgres — nunca se le puede escribir. */
const IGNORED_COLUMNS = new Set(["search_vector"]);

/**
 * Casi todos los @map(...) del schema son snake_case <-> camelCase directo
 * (tmdb_id -> tmdbId), así que toCamelCase() ya los resuelve solos. La
 * única excepción real es esta: la columna se llama distinto al campo del
 * modelo, no solo distinto formato.
 */
const COLUMN_TO_FIELD_OVERRIDES: Record<string, string> = {
  original_language: "language",
};

function rowToPrismaData(row: Record<string, any>, booleanFields: string[] = []): Record<string, any> {
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (IGNORED_COLUMNS.has(key)) continue;
    const field = COLUMN_TO_FIELD_OVERRIDES[key] || toCamelCase(key);
    data[field] = booleanFields.includes(key) ? Boolean(value) : value;
  }
  return data;
}

async function openSource() {
  const url = process.env.SOURCE_MYSQL_URL;
  if (!url) throw new Error("Falta SOURCE_MYSQL_URL");
  return mysql.createConnection(url);
}

/**
 * POST /internal/migrate/schema — el schema de Postgres ya se crea con
 * `prisma migrate deploy` en cada deploy normal a Vercel (ver
 * package.json: "vercel-build"). Este endpoint solo existe para poder
 * dispararlo a mano por HTTP si hiciera falta antes de tener el primer
 * deploy corriendo.
 */
migrateRouter.post("/internal/migrate/schema", requireSyncSecret, async (_req, res) => {
  const { execSync } = await import("child_process");
  try {
    const out = execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 120000,
    });
    res.json({ ok: true, output: out });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.stdout || e?.message || e) });
  }
});

/**
 * POST /internal/migrate/copy — copia las 24 tablas de Aiven (MySQL) a
 * Supabase (Postgres), en lotes de 200, respetando el orden de TABLE_PLAN.
 * Usa `skipDuplicates` así se puede reintentar sin duplicar filas si algo
 * falla a mitad de camino.
 */
migrateRouter.post("/internal/migrate/copy", requireSyncSecret, async (_req, res) => {
  const source = await openSource();
  const BATCH_SIZE = 200;
  const results: Record<string, { read: number; written: number; error?: string }> = {};

  try {
    for (const { table, model, booleanFields } of TABLE_PLAN) {
      try {
        const [rows] = await source.query(`SELECT * FROM \`${table}\``);
        const allRows = rows as Record<string, any>[];
        let written = 0;
        for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
          const batch = allRows.slice(i, i + BATCH_SIZE).map((r) => rowToPrismaData(r, booleanFields));
          if (batch.length === 0) continue;
          const result = await (prisma as any)[model].createMany({ data: batch, skipDuplicates: true });
          written += result.count;
        }
        results[table] = { read: allRows.length, written };
      } catch (e: any) {
        results[table] = { read: 0, written: 0, error: String(e?.message || e) };
      }
    }
    res.json({ ok: true, results });
  } finally {
    await source.end();
  }
});

/**
 * GET /internal/migrate/verify — compara COUNT(*) de cada tabla entre
 * Aiven (origen) y Supabase (destino, vía Prisma).
 */
migrateRouter.get("/internal/migrate/verify", requireSyncSecret, async (_req, res) => {
  const source = await openSource();
  const results: Record<string, { source: number; target: number; match: boolean }> = {};

  try {
    for (const { table, model } of TABLE_PLAN) {
      const [rows] = await source.query(`SELECT COUNT(*) as c FROM \`${table}\``);
      const sourceCount = Number((rows as any[])[0].c);
      const targetCount = await (prisma as any)[model].count();
      results[table] = { source: sourceCount, target: targetCount, match: sourceCount === targetCount };
    }
    res.json({ ok: true, results });
  } finally {
    await source.end();
  }
});
