import { Router } from "express";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { requireSyncSecret } from "../middleware/internalAuth";
import { prisma } from "../db/prisma";

/**
 * TEMPORAL — migración one-off de la MySQL de Hostinger a Aiven (ver
 * HANDOFF.md 3.5/3.6). Se borra este archivo (y su registro en app.ts)
 * apenas termina la migración: no es algo que deba quedar vivo en
 * producción — copia la base entera por HTTP.
 *
 * Requiere la env var TARGET_DATABASE_URL apuntando a Aiven, seteada
 * solo mientras dura la migración.
 */
export const migrateRouter = Router();

const TABLES = [
  "countries",
  "genres",
  "platforms",
  "platform_availability",
  "movies",
  "tv_shows",
  "movie_genres",
  "tv_genres",
  "cast_members",
  "content_cast",
  "streaming_links",
  "videos",
  "images",
  "similar_content",
  "users",
  "user_sessions",
  "user_regions",
  "user_ratings",
  "user_comments",
  "user_favorites",
  "user_lists",
  "user_list_items",
  "user_views",
];

/** POST /internal/migrate/schema — crea el schema (prisma migrate deploy) contra TARGET_DATABASE_URL. */
migrateRouter.post("/internal/migrate/schema", requireSyncSecret, async (_req, res) => {
  const target = process.env.TARGET_DATABASE_URL;
  if (!target) {
    res.status(400).json({ error: "Falta TARGET_DATABASE_URL" });
    return;
  }
  try {
    const out = execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: target },
      encoding: "utf-8",
      timeout: 120000,
    });
    res.json({ ok: true, output: out });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.stdout || e?.message || e) });
  }
});

/** POST /internal/migrate/copy — copia todas las filas de cada tabla, de la DB actual (DATABASE_URL) a TARGET_DATABASE_URL. */
migrateRouter.post("/internal/migrate/copy", requireSyncSecret, async (_req, res) => {
  const target = process.env.TARGET_DATABASE_URL;
  if (!target) {
    res.status(400).json({ error: "Falta TARGET_DATABASE_URL" });
    return;
  }

  const targetPrisma = new PrismaClient({ datasources: { db: { url: target } } });
  const counts: Record<string, { source: number; copied: number }> = {};

  try {
    await targetPrisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=0");

    for (const table of TABLES) {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
      let copied = 0;

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        const colList = columns.map((c) => `\`${c}\``).join(", ");
        const CHUNK = 200;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const placeholders = chunk
            .map(() => `(${columns.map(() => "?").join(", ")})`)
            .join(", ");
          const values = chunk.flatMap((row) => columns.map((c) => row[c]));
          const sql = `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders}`;
          await targetPrisma.$executeRawUnsafe(sql, ...values);
          copied += chunk.length;
        }
      }

      counts[table] = { source: rows.length, copied };
    }

    await targetPrisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS=1");
    res.json({ ok: true, counts });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e), counts });
  } finally {
    await targetPrisma.$disconnect();
  }
});

/** GET /internal/migrate/verify — compara cantidad de filas entre origen (DATABASE_URL) y TARGET_DATABASE_URL. */
migrateRouter.get("/internal/migrate/verify", requireSyncSecret, async (_req, res) => {
  const target = process.env.TARGET_DATABASE_URL;
  if (!target) {
    res.status(400).json({ error: "Falta TARGET_DATABASE_URL" });
    return;
  }
  const targetPrisma = new PrismaClient({ datasources: { db: { url: target } } });
  const result: Record<string, { source: number; target: number; match: boolean }> = {};
  try {
    for (const table of TABLES) {
      const srcRows: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM \`${table}\``);
      const tgtRows: any[] = await targetPrisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM \`${table}\``);
      const source = Number(srcRows[0].c);
      const targetCount = Number(tgtRows[0].c);
      result[table] = { source, target: targetCount, match: source === targetCount };
    }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e), partial: result });
  } finally {
    await targetPrisma.$disconnect();
  }
});
