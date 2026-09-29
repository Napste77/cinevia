import { prisma } from "../db/prisma";

/**
 * Progreso persistido de un job entre invocaciones (ver SyncCursor en
 * schema.prisma). En Render un job corría de punta a punta en un mismo
 * proceso; en Vercel cada invocación tiene un presupuesto de tiempo (ver
 * createDeadline) y puede cortar a la mitad — esto es lo que le permite
 * retomar exactamente donde quedó en la próxima invocación en vez de
 * arrancar de cero (o peor, perder de vista qué ya se procesó).
 */
export async function loadCursor<T>(job: string, initial: T): Promise<T> {
  const row = await prisma.syncCursor.findUnique({ where: { job } });
  return row ? (row.state as T) : initial;
}

export async function saveCursor(job: string, state: unknown): Promise<void> {
  await prisma.syncCursor.upsert({
    where: { job },
    create: { job, state: state as any },
    update: { state: state as any },
  });
}

export async function clearCursor(job: string): Promise<void> {
  await prisma.syncCursor.deleteMany({ where: { job } });
}

/**
 * `deadline()` devuelve true una vez que se consumió el presupuesto de
 * tiempo — se deja un margen real bajo el límite de la función serverless
 * (ver maxDuration en vercel.json) para alcanzar a guardar el cursor antes
 * de que Vercel corte la ejecución de golpe.
 */
export function createDeadline(maxMs: number) {
  const start = Date.now();
  return () => Date.now() - start >= maxMs;
}
