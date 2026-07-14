import { PrismaClient } from "@prisma/client";

// Instancia única de PrismaClient para todo el proceso: en dev con
// recarga en caliente esto evita abrir un pool de conexiones nuevo por
// cada reload (guardándola en `global`).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
