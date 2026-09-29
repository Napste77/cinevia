# NowSee API

Backend propio de NowSee. El frontend (Web/Android/iOS) solo consume esta
API — nunca TMDB, Wikidata ni ninguna otra fuente externa directamente.
Este servicio es el único que las conoce: las consulta, normaliza los
datos y los guarda en una base propia (Postgres, en Supabase), que es la
fuente real de información de la app.

Corre como función serverless en Vercel (`api/index.ts` envuelve la misma
app Express de siempre — ver `vercel.json`), con Supabase como base y
Upstash Redis como caché compartida entre invocaciones. Ver
`HANDOFF.md` (raíz del repo) para el historial completo, incluida la
migración desde el stack anterior (Render + Aiven MySQL).

```
Usuarios (Web / Android / iOS)
        │
   API NowSee (función serverless en Vercel)
        │
   Redis compartido (Upstash) — caché entre invocaciones
        │
  Base de datos NowSee (Postgres, Supabase)
        │
 ┌──────┼──────────┬─────────────┐
 │      │          │             │
TMDB Wikidata  Streaming    (futuras fuentes)
     Availability API
        │
 Jobs de sincronización por lotes (jobs/), disparados por HTTP
```

## Requisitos

- Node.js 20+
- Un proyecto de Supabase (Postgres administrado, tier gratis alcanza)
- Una API key de TMDB (gratis, solo la usa este backend — nunca se expone al cliente)
- Opcional pero recomendado: una base de Upstash Redis (REST API, tier gratis) — sin ella, la app sigue funcionando con una caché en memoria del proceso que no sobrevive entre invocaciones serverless (ver `src/utils/cache.ts`)

## Setup local

```bash
cd backend
npm install
cp .env.example .env   # completar DATABASE_URL, DIRECT_DATABASE_URL, TMDB_API_KEY, SYNC_SECRET
npx prisma migrate deploy   # crea las tablas
npx prisma db seed          # carga géneros y plataformas (catálogo fijo)
npm run dev                 # levanta la API en :4000
```

Para desarrollo local sin depender de un proyecto de Supabase real, cualquier
Postgres sirve (`postgresql://usuario:password@localhost:5432/nowsee`) —
`DATABASE_URL` y `DIRECT_DATABASE_URL` pueden apuntar a la misma URL local
(la distinción entre pooler y conexión directa solo importa en Supabase).

Para llenar la base por primera vez sin esperar al cron:

```bash
npm run sync -- daily
npm run sync -- weekly
```

## Variables de entorno (`.env`)

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Connection string de Supabase, pooler en modo "Transaction" (puerto 6543, `?pgbouncer=true`) — la usa la app en runtime |
| `DIRECT_DATABASE_URL` | Connection string directa de Supabase (puerto 5432, sin pooler) — la usan `prisma migrate`/`db push` |
| `TMDB_API_KEY` | API key de TMDB. Solo la lee el backend. |
| `STREAMING_AVAILABILITY_API_KEY` | Opcional (RapidAPI). Mejora la resolución de deep links; sin ella se sigue funcionando solo con Wikidata + overrides manuales. |
| `DEFAULT_COUNTRY` | Región usada por discover/trending/streaming links (`AR` por defecto) |
| `SYNC_SECRET` | Secreto para disparar jobs manualmente vía `/internal/sync/:job` (header `X-Sync-Secret`) |
| `CRON_SECRET` | El mismo endpoint también acepta `Authorization: Bearer <CRON_SECRET>` — es el header que Vercel agrega solo si definís esta variable y configurás un cron en `vercel.json` |
| `ENABLE_INTERNAL_CRON` | Dejar en `false` en Vercel (serverless no tiene un proceso persistente donde vivan los timers de `node-cron`) — solo tiene sentido en `true` si algún día se vuelve a correr en un servidor siempre-vivo. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Caché compartida entre invocaciones (ver `src/utils/cache.ts`). Opcional — sin ellas cae a caché en memoria del proceso. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Emails transaccionales (bienvenida, recuperar contraseña). Sin `RESEND_API_KEY` el envío se salta silenciosamente. |
| `FRONTEND_URL` | URL pública del frontend (Vercel) — se usa para armar los links de los emails. |
| `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | Cuentas de usuario (JWT). |
| `GEOIP_BASE_URL` | Detección de país por IP (ip-api.com, gratis, sin key). |

## Endpoints

Todos devuelven `{ results: [...] }` salvo `/movie/:id` y `/tv/:id`, que devuelven la ficha completa.

- `GET /movies/trending` / `GET /series/trending`
- `GET /movie/:id` / `GET /tv/:id` — `:id` es el id propio de NowSee (no el de TMDB)
- `GET /search?q=...`
- `GET /genres` / `GET /platforms`
- `GET /discover?type=movie|tv&genre=<id>&provider=<id>&country=AR&page=1`
- `GET /providers?type=movie|tv&id=<id>&country=AR`
- `GET|POST /internal/sync/:job` (`daily`|`weekly`|`monthly`) — header `X-Sync-Secret` o `Authorization: Bearer <CRON_SECRET>`. Corre UN lote acotado por tiempo y devuelve `{ done, progress, ... }`; hay que llamarlo repetidas veces (cron cada pocos minutos) hasta que `done: true` — ver "Sincronización" más abajo.
- `POST /internal/seed` (carga géneros/plataformas/países una vez), header `X-Sync-Secret`
- `GET /health` / `GET /health/db` (esta última hace una consulta real a la base, útil para keep-alive)

## Cómo funciona el "crece con el uso" (descubrimiento automático)

Cada endpoint de lectura (`/movie/:id`, `/discover`, `/search`) primero
mira la base propia. Si el contenido no existe todavía, o quedó viejo
(`last_sync`/`last_media_sync` vencidos), lo resuelve contra TMDB en ese
momento, lo guarda, y a partir de ahí ya queda servido desde la base. Si
TMDB está caído en ese instante y ya había algo guardado, se sigue
sirviendo esa última versión conocida en vez de romper la respuesta
(`sync_status`/`last_error` quedan registrados para que el job mensual lo
reintente).

## Sincronización

Tres jobs (`src/jobs/`) que corren en LOTES acotados por tiempo (una
función serverless no puede quedarse corriendo minutos enteros): cada
invocación retoma exactamente donde quedó la anterior (progreso guardado
en la tabla `sync_cursors`) y avanza todo lo que puede antes de cortar.
Por eso hay que llamarlos seguido (cada pocos minutos) hasta que
respondan `done: true`, en vez de una vez al día/semana/mes como antes:

```
curl https://tu-api.vercel.app/internal/sync/daily   -H "X-Sync-Secret: <SYNC_SECRET>"
curl https://tu-api.vercel.app/internal/sync/weekly  -H "X-Sync-Secret: <SYNC_SECRET>"
curl https://tu-api.vercel.app/internal/sync/monthly -H "X-Sync-Secret: <SYNC_SECRET>"
```

Dos formas de programarlo:

1. **Cron externo gratuito** (recomendado, sin límites de frecuencia):
   [cron-job.org](https://cron-job.org), un job por cada endpoint,
   pegándole cada 2-5 minutos con el header `X-Sync-Secret`. Mismo
   servicio que ya se usaba para el keep-alive de Render — ahora hace
   doble función (mantiene la sincronización avanzando Y, de paso, la
   base de Supabase activa).
2. **Vercel Cron** (nativo, ver `vercel.json`): agregar un bloque
   `"crons"` con la ruta y el schedule deseado. El plan Hobby de Vercel
   históricamente limita la frecuencia de los crons nativos (puede que
   solo permita 1x/día) — confirmá el límite vigente de tu plan antes de
   confiar en esto como único disparador; si tenés dudas, usá cron-job.org.

## Deploy en Vercel + Supabase

Una sola base de código para API y frontend, ambos en Vercel (proyectos
separados, mismo repo). Ver `HANDOFF.md` en la raíz para el contexto
completo de por qué se migró acá (veníamos de Render + Aiven MySQL).

1. **Crear el proyecto en Supabase** ([supabase.com](https://supabase.com),
   gratis). En Settings → Database → Connection string, copiar:
   - "Transaction" pooler (puerto 6543, con `?pgbouncer=true`) → `DATABASE_URL`
   - Conexión directa (puerto 5432) → `DIRECT_DATABASE_URL`
2. **Crear la base de Upstash Redis** ([upstash.com](https://upstash.com),
   gratis) — opcional pero recomendado. Copiar la REST URL y el token →
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. **Crear el proyecto de Vercel para el backend**: New Project → mismo
   repo de GitHub → "Root Directory" = `backend`. Completar las variables
   de entorno de la tabla de arriba (`DATABASE_URL`, `DIRECT_DATABASE_URL`,
   `TMDB_API_KEY`, `SYNC_SECRET`, `JWT_SECRET`, etc.) — el `vercel-build`
   de `package.json` corre `prisma migrate deploy` solo, las tablas se
   crean sin necesitar terminal.
4. **Si ya tenías datos en producción (Aiven MySQL) para migrar**: agregar
   temporalmente la variable `SOURCE_MYSQL_URL` (connection string de
   Aiven) a este mismo proyecto de Vercel, deployar, y disparar en orden:
   ```bash
   curl -X POST https://tu-api.vercel.app/internal/migrate/copy   -H "X-Sync-Secret: <SYNC_SECRET>"
   curl https://tu-api.vercel.app/internal/migrate/verify -H "X-Sync-Secret: <SYNC_SECRET>"
   ```
   Confirmar `match: true` en las 24 tablas del resultado de `verify`
   antes de seguir. Hecho esto, **borrar `SOURCE_MYSQL_URL` de Vercel** y
   eliminar `backend/src/routes/migrate.routes.ts` + su registro en
   `app.ts` (es una herramienta temporal, no debe quedar viva en
   producción) — commitear esa limpieza.
5. **Crear el proyecto de Vercel para el frontend**: New Project → mismo
   repo → "Root Directory" = raíz del repo (no `backend`). Variable de
   entorno `EXPO_PUBLIC_API_BASE_URL` → la URL del proyecto backend del
   paso 3. El `vercel.json` de la raíz ya trae el build command
   (`expo export --platform web`) y los rewrites/headers necesarios.
6. Volver al proyecto backend y actualizar `FRONTEND_URL` con la URL real
   del frontend recién creado (se usa para armar los links de los emails).
7. Configurar el cron de sincronización (ver sección de arriba) apuntando
   a la nueva URL de Vercel.
8. Una vez confirmado que todo funciona igual o mejor que antes, dar de
   baja el servicio viejo de Render y (cuando ya no haga falta como
   respaldo) el de Aiven.

## Límites conocidos (para la próxima vuelta)

- `streaming_links`, `content_cast`, `videos`, `images` y `similar_content` usan `(content_type, content_id)` en vez de una FK real, porque referencian tanto `movies` como `tv_shows` (Prisma no tiene asociaciones polimórficas nativas). La integridad la garantiza la capa de servicios, y el job mensual barre huérfanos — pero si se escribe directo por SQL sin pasar por los servicios, hay que respetar esa convención.
- `/movies/trending` y `/series/trending` reflejan el país configurado en `DEFAULT_COUNTRY` del backend (el que usaron los jobs de sync), no un país por request — hoy la app solo usa un país fijo (`AR`) así que no es una regresión, pero un selector de región a futuro necesitaría sincronizar por país o resolver bajo demanda por región.
- La cobertura de `/discover` (por género/plataforma) crece de a poco: cada página no sincronizada todavía se resuelve en vivo la primera vez que alguien la pide. En un catálogo nuevo, las primeras visitas a una categoría poco popular pueden tardar un poco más mientras se completa esa página.
