-- Búsqueda full-text (reemplaza el @@fulltext + MATCH/AGAINST de MySQL).
-- `search_vector` es una columna generada (Postgres la recalcula sola en
-- cada INSERT/UPDATE, nunca se escribe desde Prisma) indexada con GIN para
-- que la consulta en src/services/search.ts sea rápida incluso con miles
-- de filas. `simple` como config de texto evita el stemming en español/
-- inglés mezclado (títulos de películas no son prosa, y así el ranking no
-- depende de a qué idioma "cree" Postgres que pertenece cada título).
ALTER TABLE "movies"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("original_title", ''))
  ) STORED;

CREATE INDEX "movies_search_vector_idx" ON "movies" USING GIN ("search_vector");

ALTER TABLE "tv_shows"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("original_title", ''))
  ) STORED;

CREATE INDEX "tv_shows_search_vector_idx" ON "tv_shows" USING GIN ("search_vector");
