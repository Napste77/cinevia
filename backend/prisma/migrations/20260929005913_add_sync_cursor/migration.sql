-- Prisma generó también DROP INDEX de los índices GIN de búsqueda y un
-- ALTER COLUMN ... DROP DEFAULT sobre "search_vector" — falsos positivos
-- de su diff engine con columnas `Unsupported` (no entiende que son
-- generadas, ni conoce el índice GIN que no está en el DSL). Se
-- eliminaron a mano; lo único real de este cambio de schema es la tabla
-- nueva de abajo.

-- CreateTable
CREATE TABLE "sync_cursors" (
    "id" SERIAL NOT NULL,
    "job" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursors_job_key" ON "sync_cursors"("job");
