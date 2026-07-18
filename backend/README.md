# NowSee API

Backend propio de NowSee. El frontend (Web/Android/iOS) solo consume esta
API — nunca TMDB, Wikidata ni ninguna otra fuente externa directamente.
Este servicio es el único que las conoce: las consulta, normaliza los
datos y los guarda en una base propia (MySQL), que es la fuente real de
información de la app.

```
Usuarios (Web / Android / iOS)
        │
   API NowSee (este backend)
        │
  Base de datos NowSee (MySQL)
        │
 ┌──────┼──────────┬─────────────┐
 │      │          │             │
TMDB Wikidata  Streaming    (futuras fuentes)
     Availability API
        │
 Workers de sincronización (jobs/)
```

## Requisitos

- Node.js 18+
- Una base MySQL (cualquier plan de Hostinger la trae; en un VPS también se puede instalar Postgres si se prefiere, pero el schema está escrito para MySQL)
- Una API key de TMDB (gratis, solo la usa este backend — nunca se expone al cliente)

## Setup local

```bash
cd backend
npm install
cp .env.example .env   # completar DATABASE_URL, TMDB_API_KEY, SYNC_SECRET
npx prisma migrate deploy   # crea las tablas
npx prisma db seed          # carga géneros y plataformas (catálogo fijo)
npm run dev                 # levanta la API en :4000
```

Para llenar la base por primera vez sin esperar al cron:

```bash
npm run sync -- daily
npm run sync -- weekly
```

## Variables de entorno (`.env`)

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Cadena de conexión MySQL (`mysql://usuario:password@host:3306/nowsee`) |
| `TMDB_API_KEY` | API key de TMDB. Solo la lee el backend. |
| `STREAMING_AVAILABILITY_API_KEY` | Opcional (RapidAPI). Mejora la resolución de deep links; sin ella se sigue funcionando solo con Wikidata + overrides manuales. |
| `DEFAULT_COUNTRY` | Región usada por discover/trending/streaming links (`AR` por defecto) |
| `SYNC_SECRET` | Secreto para disparar jobs vía `POST /internal/sync/:job` |
| `ENABLE_INTERNAL_CRON` | `true` en un VPS donde el proceso corre siempre (agenda los jobs con `node-cron`). `false` en hosting compartido — ver más abajo. |

## Endpoints

Todos devuelven `{ results: [...] }` salvo `/movie/:id` y `/tv/:id`, que devuelven la ficha completa.

- `GET /movies/trending` / `GET /series/trending`
- `GET /movie/:id` / `GET /tv/:id` — `:id` es el id propio de NowSee (no el de TMDB)
- `GET /search?q=...`
- `GET /genres` / `GET /platforms`
- `GET /discover?type=movie|tv&genre=<id>&provider=<id>&country=AR&page=1`
- `GET /providers?type=movie|tv&id=<id>&country=AR`
- `POST /internal/sync/:job` (`daily`|`weekly`|`monthly`), header `X-Sync-Secret`
- `POST /internal/seed` (carga géneros/plataformas/países una vez), header `X-Sync-Secret`

## Cómo funciona el "crece con el uso" (descubrimiento automático)

Cada endpoint de lectura (`/movie/:id`, `/discover`, `/search`) primero
mira la base propia. Si el contenido no existe todavía, o quedó viejo
(`last_sync`/`last_media_sync` vencidos), lo resuelve contra TMDB en ese
momento, lo guarda, y a partir de ahí ya queda servido desde la base. Si
TMDB está caído en ese instante y ya había algo guardado, se sigue
sirviendo esa última versión conocida en vez de romper la respuesta
(`sync_status`/`last_error` quedan registrados para que el job mensual lo
reintente).

## Sincronización automática

Tres jobs (`src/jobs/`), pensados para poder dispararse de dos formas
según lo que permita el hosting:

1. **Un VPS con el proceso corriendo siempre**: poner `ENABLE_INTERNAL_CRON=true`
   y listo — el propio server se agenda con `node-cron` (diario 03:00,
   semanal lunes 04:00, mensual día 1 05:00). También se pueden disparar a
   mano: `npm run sync -- daily|weekly|monthly`.
2. **Hosting compartido / cloud (no se puede dejar un cron de Node corriendo)**:
   dejar `ENABLE_INTERNAL_CRON=false` y configurar un Cron Job desde hPanel
   (o un cron externo gratuito como cron-job.org) que pegue:

   ```
   curl -X POST https://tu-api.com/internal/sync/daily   -H "X-Sync-Secret: <SYNC_SECRET>"
   curl -X POST https://tu-api.com/internal/sync/weekly  -H "X-Sync-Secret: <SYNC_SECRET>"   # 1x/semana
   curl -X POST https://tu-api.com/internal/sync/monthly -H "X-Sync-Secret: <SYNC_SECRET>"   # 1x/mes
   ```

## Deploy en Render (gratis, recomendado si tu hosting no soporta Node.js)

Si tu hosting solo tiene MySQL (ej. un plan compartido de Hostinger sin
sección "Node.js"), el backend puede correr gratis en Render y conectarse
a esa base por Internet — no hace falta que el hosting soporte Node.

1. **Habilitar acceso remoto a la base** desde el panel de tu hosting
   (en Hostinger: hPanel → Bases de datos → Remote MySQL). Ahí te va a
   mostrar un host tipo `srv###.hstgr.io` — anotalo, es el `DATABASE_URL`.
   Autorizá la IP de Render cuando la tengas (Render no publica IPs fijas
   en el plan free; si tu panel exige una IP puntual y no acepta rangos,
   puede hacer falta pasar a un plan pago de Render con IP saliente fija,
   o usar `%` / rango amplio si tu hosting lo permite — revisar las
   opciones que ofrezca tu panel).
2. En [render.com](https://render.com), crear cuenta (gratis, sin tarjeta)
   y **New → Blueprint**, apuntando al repo de GitHub — el `render.yaml`
   de la raíz ya define el servicio (`rootDir: backend`, build/start
   commands). Si preferís no usar Blueprint: **New → Web Service**, mismo
   repo, "Root Directory" = `backend`, build command
   `npm install && npm run build`, start command `npm start`.
3. Completar las variables de entorno marcadas `sync: false` en el
   dashboard de Render (no van en el `render.yaml` por seguridad):
   - `DATABASE_URL` → `mysql://usuario:password@host:3306/nombre_base`
     (los datos que anotaste en el paso 1)
   - `TMDB_API_KEY`
   - `STREAMING_AVAILABILITY_API_KEY` (opcional, se puede dejar vacía)

   `JWT_SECRET` y `SYNC_SECRET` los genera Render solos
   (`generateValue: true` en el blueprint) — andá a la pestaña
   "Environment" del servicio para verlos si los necesitás.
4. Al desplegar, `npm start` corre `prisma migrate deploy` automáticamente
   antes de levantar el servidor — las tablas se crean solas, no hace
   falta terminal.
5. Cargar el catálogo fijo (géneros/plataformas/países) una sola vez,
   sin necesitar shell (el plan free de Render no la incluye):
   ```bash
   curl -X POST https://tu-servicio.onrender.com/internal/seed \
     -H "X-Sync-Secret: <el valor generado en el paso 3>"
   ```
6. El plan free de Render "duerme" el servicio tras 15 minutos sin
   tráfico (el primer request después tarda unos segundos en "despertar").
   Para los jobs de sincronización, configurar un cron externo gratuito
   (ej. [cron-job.org](https://cron-job.org)) que pegue a
   `/internal/sync/daily|weekly|monthly` — así de paso el cron mantiene el
   servicio despierto.

## Deploy en Hostinger

### Si es un VPS (acceso root/SSH)

1. Instalar Node.js 18+ y MySQL (o usar el gestor de bases de datos de hPanel).
2. Clonar el repo, `cd backend && npm install && npm run build`.
3. Completar `.env` (con `ENABLE_INTERNAL_CRON=true` si querés que el propio proceso se agende solo).
4. Correr con un supervisor de procesos (PM2 o systemd) para que se reinicie solo:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name nowsee-api
   pm2 save && pm2 startup
   ```
5. Poner nginx (o el proxy que traiga el VPS) delante, apuntando al puerto de `PORT` (4000 por defecto), con HTTPS.

### Si es hosting compartido / cloud (hPanel)

1. Crear una base MySQL desde hPanel (Bases de datos → MySQL) y anotar host/usuario/password/nombre.
2. Configurar la app Node.js desde hPanel (Avanzado → Node.js), apuntando a `backend/dist/server.js` como entry point, con las variables de entorno del `.env` cargadas ahí (`ENABLE_INTERNAL_CRON=false`).
3. Correr `npx prisma migrate deploy && npx prisma db seed` una vez (hPanel deja abrir una terminal/SSH limitada para esto, o correrlo localmente apuntando `DATABASE_URL` a la base remota).
4. Configurar 3 Cron Jobs desde hPanel (Avanzado → Cron Jobs) que peguen a `/internal/sync/daily` (diario), `/internal/sync/weekly` (semanal) y `/internal/sync/monthly` (mensual) como se muestra arriba.

### Frontend (Netlify)

En Netlify, agregar la variable de entorno `EXPO_PUBLIC_API_BASE_URL` apuntando a la URL pública de este backend (ej. `https://api.nowsee.com`), y volver a deployar. El frontend no necesita ningún otro cambio de configuración.

## Límites conocidos (para la próxima vuelta)

- `streaming_links`, `content_cast`, `videos`, `images` y `similar_content` usan `(content_type, content_id)` en vez de una FK real, porque referencian tanto `movies` como `tv_shows` (Prisma no tiene asociaciones polimórficas nativas). La integridad la garantiza la capa de servicios, y el job mensual barre huérfanos — pero si se escribe directo por SQL sin pasar por los servicios, hay que respetar esa convención.
- `/movies/trending` y `/series/trending` reflejan el país configurado en `DEFAULT_COUNTRY` del backend (el que usaron los jobs de sync), no un país por request — hoy la app solo usa un país fijo (`AR`) así que no es una regresión, pero un selector de región a futuro necesitaría sincronizar por país o resolver bajo demanda por región.
- La cobertura de `/discover` (por género/plataforma) crece de a poco: cada página no sincronizada todavía se resuelve en vivo la primera vez que alguien la pide. En un catálogo nuevo, las primeras visitas a una categoría poco popular pueden tardar un poco más mientras se completa esa página.
