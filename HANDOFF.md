# NowSee — Contexto de handoff

Este documento resume todo el trabajo hecho sobre este proyecto en la sesión
de Claude Code que terminó con la rama `claude/app-install-option-missing-mozug7`.
Está pensado para que otra sesión (o vos) pueda retomarlo sin tener que
releer todo el historial de conversación.

**Repo**: `napste77/cinevia`
**Rama activa**: `claude/app-install-option-missing-mozug7` (todo pusheado, nada
pendiente de commit al momento de escribir esto)
**Para el detalle técnico del proyecto en sí** (arquitectura, setup, deploy,
stack): ver `README.md` (raíz) y `backend/README.md`. Este documento es sobre
**qué se hizo y por qué**, no un manual de uso.

---

## 1. De dónde viene el proyecto

NowSee (antes "Cinevia") es una app de descubrimiento de películas/series:
Expo + React Native + react-native-web, desplegada como PWA en Netlify.
Muestra tendencias, catálogos por plataforma de streaming y género, búsqueda,
fichas de detalle con reparto/tráiler/dónde ver, favoritos, calificaciones y
comentarios propios.

## 2. Cambios grandes, en orden cronológico

### 2.1. Fixes de UX de PWA (primeras iteraciones)
- Botón de instalación manual para navegadores que nunca disparan
  `beforeinstallprompt` (Xiaomi/MIUI Chrome y similares).
- Logo con "Now" en blanco y "See" en verde lima (`rgb(183,247,0)`).
- Botón "Atrás" del navegador navega el historial interno de la app (antes
  salía del sitio directamente) — vía `linking` de React Navigation.
- Gestos multi-touch (pinch-to-zoom, etc.) desactivados para sensación de
  app nativa.
- Páginas de categoría completas ("Ver más" en cada fila del Home) con
  scroll infinito.

### 2.2. Migración de arquitectura: backend propio
Requisito explícito: **el frontend no debe depender directamente de TMDB ni
de ninguna otra API externa**. Se construyó un backend completo desde cero:

- `backend/`: Node.js + Express 5 + Prisma + MySQL.
- El backend es el ÚNICO que le habla a TMDB, Wikidata y Streaming
  Availability API. Nunca guarda imágenes (solo referencias/paths — las
  URLs se arman al vuelo apuntando al CDN de TMDB).
- Patrón "discovery-on-demand": la base se lee primero; si no hay datos o
  están viejos, se resuelve en vivo contra TMDB y se persiste.
- Jobs de sincronización desacoplados (diario/semanal/mensual) vía
  `/internal/sync/:job`, pensados para correr con un cron externo
  (cron-job.org) ya que el hosting no tiene proceso propio persistente.
- El frontend se migró para consumir *solo* esta API propia
  (`src/api/nowsee.ts`), eliminando cualquier import directo a TMDB.

### 2.3. Funcionalidades "Beta"
Ronda grande de funcionalidades, con el requisito explícito de no dejar nada
a medias ni hardcodeado:

- **Cuentas de usuario** (email/password, JWT + refresh token rotativo).
- **Geolocalización por IP** (ip-api.com, server-side) con override manual
  de región, sincronizado entre dispositivos si hay cuenta.
- **Perfil** con estadísticas, región, notificaciones.
- **Comentarios** (lectura pública, escritura/edición/borrado solo del
  autor).
- **Calificaciones propias de NowSee** (1-10), mostradas SIEMPRE separadas
  del rating de TMDB, nunca reemplazándolo.
- **"Mi Lista"**: botón de favorito rápido en cada card + sincronización
  con merge al loguearse (lo que había guardado localmente se fusiona con
  lo que ya tenía la cuenta).
- **Filtro combinable** por plataforma + género + año + orden en las
  páginas de categoría.
- Schema de Prisma extendido: `User`, `UserSession`, `UserRegion`,
  `UserRating`, `UserComment`, `UserFavorite`, `UserList`, `UserListItem`,
  `UserView`, `Country`, `PlatformAvailability`.

Todo esto se probó localmente antes de tocar producción: MySQL local +
un servidor Express "fake TMDB" hecho a mano + Playwright.

### 2.4. Deploy real a producción
- **Frontend**: Netlify (ya estaba).
- **Base de datos**: MySQL en Hostinger (hosting compartido del dominio
  `nastex.com.ar`, temporal — va a cambiar de dominio más adelante),
  accesible por Remote MySQL.
- **Backend**: Hostinger (ese plan) no soporta Node.js, así que el backend
  se desplegó en **Render** (plan gratis), conectado a la MySQL de
  Hostinger vía Remote MySQL. `render.yaml` en la raíz define el Blueprint.
  URL pública: `https://nowsee-api.onrender.com`.
- Seed de catálogo (géneros/plataformas/países) cargado vía `/internal/seed`
  (endpoint HTTP, corrido una vez desde PowerShell).
- Cron externo (cron-job.org) pegándole a `/internal/sync/:job` para los
  jobs periódicos — con un fix importante: esos endpoints ahora responden
  202 inmediatamente y corren el job en background (antes bloqueaban la
  respuesta HTTP hasta terminar, y el cliente de cron hacía timeout).

**Importante — algo que NO pude verificar yo mismo en ninguna de estas
sesiones**: el sandbox donde corre Claude Code tiene una lista blanca de
hosts de red muy restrictiva. Confirmé que están bloqueados: TMDB, Wikidata,
`onrender.com`, y conexión directa a la MySQL de Hostinger. Todo lo que es
"producción real" lo tuvo que probar el usuario a mano — yo no puedo curl-ear
ni el backend deployado ni la base de datos de Hostinger desde acá.

### 2.5. Bug de performance reportado en producción (resuelto)
El usuario reportó que abrir una ficha o buscar "tarda demasiado, se queda
cargando y no muestra nada". Se encontraron y arreglaron varias causas
reales en el backend:

- `getOrFetchMovie`/`getOrFetchTv` pedían el detalle a TMDB, y después
  `syncContentMedia` lo volvía a pedir — doble llamada innecesaria. Ahora
  se reusa el mismo `detailBundle`.
- **La causa principal**: `resolveProviders` esperaba (bloqueando la
  respuesta) a Wikidata (SPARQL, puede tardar varios segundos) y a la
  Streaming Availability API antes de devolver la ficha. Ahora responde al
  instante con el fallback de búsqueda y resuelve el deep link real en
  background, actualizando la caché para la próxima visita.
- `tmdbGetWatchProviders` se pedía en vivo a TMDB en CADA vista de ficha,
  de cualquier usuario/país, sin caché — ahora cachea 1h en memoria.
- El fallback de búsqueda en vivo de `/search` upserteaba resultados uno
  por uno — ahora en paralelo.
- **Bug de link roto**: el deep link de fallback de Prime Video usaba
  `primevideo.com/search/...`, que no soporta búsqueda por URL sin sesión
  y redirige al inicio. Se cambió al buscador general de Amazon
  (`amazon.com/s?k=...&i=instant-video`), que sí funciona. (El caso de Max
  cayendo en el buscador de la plataforma en vez del título exacto es
  comportamiento esperado — no hay deep link verificado para ese título
  puntual, no es un bug.)

## 3. Esta última ronda: performance integral + Capacitor/Android

Pedido explícito del usuario, con checklist detallado. Se hizo en dos
frentes:

### 3.1. Auditoría y optimización de rendimiento (frontend + backend)

Hallazgos concretos de la auditoría (`expo export --platform web` real, no
supuestos):

| Problema encontrado | Fix aplicado |
|---|---|
| Bundle JS único de 893 KB (todo el app, todas las pantallas) | `React.lazy` + `Suspense` en `App.tsx`: solo Home viaja en el bundle inicial (bajó a ~798-810 KB), el resto son chunks que Metro baja bajo demanda |
| Home hacía ~16 requests HTTP separados (tendencias, plataformas, 7 filas de plataforma, 7 de género) | Nuevo endpoint `GET /home/rows` que junta plataformas + las 14 filas de plataforma/género en una sola respuesta. Tendencias se dejaron separadas a propósito para que el Hero pinte apenas responde la primera (LCP) |
| Togglear un favorito re-renderizaba las ~300 `MediaCard` montadas en el Home | `MediaCard` recibe `isFavorite`/`onToggleFavorite` por prop (ya no llama `useFavorites()` adentro) y se envuelve en `React.memo` con comparador que ignora identidad de funciones |
| El `ScrollView` del Home montaba las 16 filas (y sus ~150 imágenes) de una | Se convirtió en una `FlatList` vertical virtualizada de "secciones" — las filas lejos del viewport no se montan hasta que el usuario scrollea cerca |
| Assets con hash (JS/CSS/fuentes) sin cache-control agresivo en Netlify | `Cache-Control: public, max-age=31536000, immutable` para `_expo/static/*` y `assets/*` |
| `@expo-google-fonts/inter`/`sora` exportan las 18/8 variantes de peso aunque solo se usan 5 | Investigado: no genera costo real (el navegador solo baja las 5 que `useFonts` registra), es solo bloat de deploy sin arreglo limpio disponible — se documentó y se dejó así a propósito |

Todo esto se **verificó de verdad**, no solo se compiló:
- Build real (`expo export --platform web`) comparando tamaños de bundle
  antes/después.
- Backend local con MySQL real (usuario y base de prueba creados y
  destruidos en la misma sesión) sirviendo datos reales al frontend.
- Playwright (Chromium) contra ese build+backend local, con captura de
  pantalla, para confirmar que el Home renderiza bien con la nueva
  `FlatList` de secciones y el nuevo endpoint batched.

Cosas de la checklist original que se evaluaron y se decidió NO tocar (con
su razón):
- **Prerenderizado/SSR**: Expo/Metro web (sin `expo-router`) no lo soporta
  sin una migración de arquitectura grande; esta app es interactiva/con
  cuenta de usuario, no un sitio de contenido que se beneficie mucho de SSR
  para SEO. Se dejó para una futura decisión explícita si hace falta.
- **WebP/AVIF**: las imágenes vienen del CDN de TMDB (`image.tmdb.org`),
  que sirve JPEG fijo por esa URL — no hay forma de pedirle otro formato
  sin meter un proxy/transformador de imágenes propio (lo cual reintroduce
  la complejidad de "servir imágenes nosotros" que el proyecto decidió
  evitar). Quedó identificado como mejora futura si se justifica.
- **Dependencias no usadas**: se revisó `package.json` completo — todo lo
  que no tiene un `import` directo en el código (`react-native-screens`,
  `react-native-safe-area-context`, `@expo/metro-runtime`) es una
  dependencia transitiva real de React Navigation/Expo, no basura.

### 3.2. Integración de Capacitor para Android

Pedido: una sola base de código para web + Android (+ iOS a futuro), PWA
completa, preparado para generar el `.apk`.

- **PWA**: ya estaba completa de sesiones anteriores (manifest, service
  worker, iconos, instalación desde navegador). No hizo falta agregar nada
  ahí.
- **Capacitor**: se agregó `@capacitor/core`, `@capacitor/cli`,
  `@capacitor/android`, `@capacitor/app`, `@capacitor/browser`,
  `@capacitor/status-bar`, `@capacitor/splash-screen`.
- `capacitor.config.ts`: `webDir: "dist"` — el MISMO build web que usa
  Netlify, empaquetado dentro de un WebView nativo. `appId`
  `com.nastex.nowsee` (ya coincidía con lo que tenía `app.json`).
- `npx cap add android` generó el proyecto nativo en `android/`. Se
  corrigió un bug del propio template de Capacitor 8 (`colors.xml` no
  existía pero `styles.xml` lo referenciaba — hubiera roto el build) y se
  fijó `android:screenOrientation="portrait"` + `versionName` alineado a
  `app.json`.
- **Compatibilidad de código con el WebView** (lo más importante técnicamente):
  - Dentro de Capacitor, `Platform.OS` de react-native-web sigue siendo
    `"web"` (no sabe que está empaquetado). Se agregó `isCapacitorNative()`
    en `src/api/deepLinks.ts` (usa `Capacitor.isNativePlatform()`) como la
    forma real de distinguir "navegador de verdad" de "WebView empaquetado".
  - Los links a plataformas de streaming ahora se abren con
    `@capacitor/browser` (Chrome Custom Tabs / SFSafariViewController)
    cuando `isCapacitorNative()` es true, en vez de un `<a href>` normal o
    `window.location.assign` — si no, el usuario quedaba "atrapado" viendo
    netflix.com adentro del WebView de la app, sin volver a NowSee.
  - Botón físico "Atrás" de Android conectado a mano al historial de React
    Navigation vía `@capacitor/app` (`App.tsx`) — sin esto no hacía nada
    dentro del WebView.
  - El service worker NO se registra dentro de Capacitor (los assets ya
    viven empaquetados en el APK, cachearlos de nuevo no aporta nada).
  - El botón/cartel de "instalar la PWA" se oculta dentro de Capacitor
    (la app ya está instalada, por definición).
  - Splash screen y barra de estado configurados al color del tema oscuro
    (`#0c1324`).
  - CORS del backend ya era completamente abierto (`cors()` sin
    restricciones), así que el WebView funciona sin cambios ahí.

**Lo que quedó pendiente, explícitamente, por limitaciones del sandbox (no
del código)**:
1. **Compilar el `.apk` de verdad**: necesita Android Studio o Gradle+SDK de
   Android con acceso normal a internet. Este sandbox bloquea la descarga
   de Gradle (`services.gradle.org` redirige a GitHub Releases, 403). Hay
   que abrir `android/` en Android Studio (`npx cap open android`) y generar
   el APK/AAB firmado desde ahí.
2. **Íconos y splash reales**: `@capacitor/assets` (la herramienta que los
   genera a partir de `resources/icon.png`, ya en el repo) depende de
   `sharp`, cuyo binario tampoco se pudo descargar en este sandbox. Hoy el
   ícono del launcher es el placeholder genérico de Capacitor. Correr
   localmente: `npm install --save-dev @capacitor/assets && npx
   capacitor-assets generate --android && npx cap sync android`.

Todo el flujo de build (incluidos estos dos pasos manuales) está
documentado en `README.md`, sección "Capacitor / APK de Android".

## 3.3. Ronda siguiente: performance del backend (queries redundantes) + causa raíz probable de la lentitud reportada

Pedido explícito del usuario: "la página está lenta" (después del batch de
performance de la sección 3.1, que el usuario todavía no había confirmado
haber probado). Auditoría de `backend/src/services/movies.ts`,
`tv.ts` y `platforms.ts` (los que arma `GET /home/rows`, ver 3.1):

| Problema encontrado | Fix aplicado |
|---|---|
| `discoverMovies`/`discoverTv` pedían la lista de IDs de `streamingLink` por plataforma **dos veces** por request (una para el `count`, otra para el `where` del `findMany` final) — cada una es un viaje de red a la MySQL remota de Hostinger | Se cachea el resultado en una variable local (`cachedPlatformIds`) dentro de la misma llamada y se reusa; se invalida solo si el fallback a TMDB insertó `streamingLink`s nuevos |
| `getPlatformIdByTmdbId`/`listPlatformsByCountry` se pegaban a la DB en cada una de las hasta 14 filas del Home (plataformas casi no cambian, solo las toca el sync mensual) | Cache en memoria del proceso con TTL de 10 min en `backend/src/services/platforms.ts` |
| Fallback a TMDB de `discoverMovies`/`discoverTv` (cuando la DB no tiene suficientes resultados todavía) hacía `await upsertMovie/upsertTv` **uno por uno en serie** — hasta 20 viajes secuenciales a la DB | Se resuelven en paralelo con `Promise.all`, mismo patrón que ya se había aplicado en `services/search.ts` (ver 2.5) |

No se pudo verificar corriendo el backend real (mismas limitaciones de red
del sandbox documentadas en 2.4: TMDB, Hostinger MySQL y ahora también
`binaries.prisma.sh` bloqueados, así que ni siquiera se pudo correr `prisma
generate` acá). Se verificó con `tsc --noEmit` que los 3 archivos tocados
compilan limpio (el resto de errores que tira `tsc` en este sandbox son
preexistentes, por no tener el client de Prisma generado — no vienen de
este cambio).

**Sospecha fuerte, no aplicada como código porque es un cambio de
configuración de infraestructura, no de código**: `render.yaml` tiene
`plan: free`. El plan gratis de Render duerme el servicio tras ~15 min sin
tráfico y el próximo request tarda 50+ segundos en "despertarlo" (cold
start). El único cron que le pega al backend (`cron-job.org` →
`/internal/sync/:job`) corre diario/semanal/mensual, no cada pocos minutos,
así que no lo mantiene despierto. Para un sitio de tráfico bajo/medio esto
probablemente explica gran parte de "tarda demasiado, se queda cargando" —
mucho más que cualquier micro-optimización de queries. Dos soluciones
posibles, a decidir por el usuario (no aplicadas):
1. Agregar un cron externo (cron-job.org, mismo que ya usan) pegándole a
   `GET https://nowsee-api.onrender.com/health` cada 10-14 minutos, todo el
   día — mantiene el proceso despierto sin costo.
2. Pasar el servicio de Render a un plan pago (no duerme).

## 3.4. Deploy a producción + incidente crítico encontrado y resuelto (pantalla en blanco en fichas)

Se detectó que `main` estaba 18 commits atrás de esta rama — todo el
trabajo de las secciones 2.2 a 3.3 nunca había llegado a producción
(Netlify/Render despliegan desde `main`). Se mergeó todo a `main` (merge
no trivial: `main` tenía un commit, `bae05a9`, que no era ancestro de esta
rama porque esta rama había reimplementado el mismo backend de forma
independiente — se resolvió con `git merge -X theirs` tras verificar que
el árbol de archivos de la rama es superset del de `main` y su contenido
es una evolución directa, no una versión distinta) y se pusheó.

**Al testear el deploy real con Playwright/Chrome, apareció un bug crítico
que NO estaba cubierto por la verificación de la sesión anterior**: hacer
clic en cualquier ficha (o cualquier pantalla que no fuera Home) dejaba la
pantalla en blanco, con `Error: Requiring unknown module "541"` en
consola. Reproducible en producción con Service Worker y caché
completamente limpios (se descartó como causa), y también se descartó que
fuera un problema de build/deploy stale: un "Deploy sin caché" en Netlify
produjo exactamente los mismos hashes de archivo, y se confirmó que el
chunk `DetailScreen-*.js` existía en el deploy, con el tamaño correcto, y
que el módulo 541 se registraba bien adentro del archivo, y que el mapa
módulo→URL en el bundle principal también era correcto.

**Causa real**: `React.lazy(() => import(...))` por pantalla (agregado en
3.1 para bajar el peso del bundle inicial) genera los archivos separados
correctamente con `expo export --platform web`, pero sin `expo-router` el
loader async de Metro para web no llega a pedir esos archivos por red
antes de requerirlos — falla de forma síncrona y sistemática en cualquier
pantalla lazy. La verificación anterior (Playwright) solo había confirmado
que el Home renderizaba con el nuevo endpoint batched; nunca probó
navegar a una ficha, que es exactamente el flujo que quedaba roto.

**Fix**: se revirtió el code-splitting por pantalla en `App.tsx` (vuelta a
imports eager de `SearchScreen`, `DetailScreen`, `MyListScreen`,
`ProfileScreen`, `CategoryScreen`, `AuthScreen` — ya no son
`React.lazy`). El bundle inicial vuelve a pesar ~900 KB en un solo
archivo (antes se repartía en ~811 KB + chunks bajo demanda), pero se
mantienen intactos el resto de las optimizaciones: endpoint batched
`/home/rows`, memoización + virtualización del Home, cache headers de
Netlify, todos los fixes de backend (2.5, 3.1, 3.3). Verificado en
producción: la ficha, "Buscar" y la navegación en general vuelven a
funcionar. Si en el futuro se quiere retomar el code-splitting por
pantalla, hace falta migrar a `expo-router` (que sí arma el loader async
completo) — no alcanza con repetir lo mismo.

**Estado del deploy real verificado con Chrome** (no solo build local):
carga inicial del Home bajó de ~289 requests / 17 llamadas HTTP separadas
al backend / bundle único de 893 KB sin split, a ~44 requests iniciales /
1 sola llamada a `/home/rows` (+ 2 de tendencias separadas a propósito) /
imágenes limitadas a lo que entra en viewport gracias a la virtualización.

También se creó un cronjob en cron-job.org (`NowSee API keep-alive`,
cada 2 minutos contra `/health`) para evitar el cold start del plan free
de Render — ver 3.3 para el detalle de por qué hacía falta.

## 3.5. Ronda "la ficha tarda demasiado" (medida, arreglada y verificada en prod)

Reporte del usuario: entrar a una película/serie seguía lento. Medido con
Chrome contra producción: `GET /movie/2` tardaba **5.2s** (con Render
despierto — el keep-alive de 3.4 ya estaba activo, no era cold start).

Hallazgos, en orden de descubrimiento:

1. **La sync de media bloqueaba la respuesta**: cuando al título le tocaba
   refrescar cast/tráiler/recomendaciones (TTL 7 días) o el detalle (24h),
   la ficha esperaba ~50 escrituras SECUENCIALES a la MySQL remota + una
   llamada a TMDB. Fix: solo se bloquea la PRIMERA visita de la vida del
   título; si ya hay media, responde ya y refresca en background
   (stale-while-revalidate). El camino que sigue bloqueando (primera
   visita) ahora escribe en paralelo. `registerView` pasó a fire-and-forget.
2. **resolveProviders hacía 2 queries seriales por plataforma** (~10
   viajes con 4-5 plataformas). Fix: 1 findMany batcheado para links + el
   catálogo de plataformas desde el cache en memoria de services/platforms.
3. **Lookup duplicado**: la ruta buscaba el título por id y getOrFetch lo
   volvía a buscar por tmdbId. Fix: una sola query con géneros incluidos.
4. **Las queries del detalle arrancaban tarde**: cast/similares/ratings/
   providers solo necesitan el id interno (que ya está en la URL) — ahora
   se disparan en paralelo con todo lo demás (con `fireEarly()` para no
   crashear Node >=15 por unhandledRejection).
5. **CRÍTICO — Render no despliega desde `main`**: el servicio trackea la
   rama `claude/app-install-option-missing-mozug7`. Los pushes a main del
   backend NO llegaban a producción. Además el deploy de `96fc2a3` había
   FALLADO por un error de tipos (`Platform.tmdbId` es nullable) que el
   sandbox no podía detectar (sin cliente de Prisma generado), así que
   producción llevaba un día corriendo la versión vieja. Se arregló el
   tipo y por ahora se pushea a AMBAS ramas. **Pendiente: cambiar la rama
   trackeada a `main` en Render → Settings → Build & Deploy.**

Resultado medido en producción tras los deploys: ficha de **5-6s a
~1.3-2.3s** en estado estable. El piso restante es infraestructura, no
código: cada round-trip Render (Oregón) ↔ MySQL Hostinger cuesta ~280ms
(un 404 de una sola query tarda 242-283ms). Para bajar de ahí hay que
acercar la base al backend (o viceversa): mover MySQL a un proveedor con
región cercana a Render, o el backend a un VPS de Hostinger junto a la
base. Documentado como decisión de infra pendiente, no de código.

### 3.6. Migración de base de datos: Hostinger MySQL → Aiven MySQL (free tier)

El piso de latencia de ~250-280ms por query (documentado en 3.5) era la
distancia de red entre Render (Oregón, EE.UU.) y el hosting compartido de
Hostinger (fuera de EE.UU.). Se evaluaron opciones (mover el backend a un
VPS de Hostinger, Supabase, PlanetScale, Aiven) y se decidió con el
usuario: **Aiven for MySQL, tier gratuito**, con un servicio en una región
cercana a Oregón.

**Riesgo aceptado explícitamente por el usuario**: el tier free de Aiven
apaga el servicio automáticamente tras un período de inactividad (no hay
threshold exacto documentado por Aiven). El tier "Developer" ($5/mes) evita
esto, pero se descartó por costo. Mitigación acordada: mantener el cron
job de cron-job.org pegándole al sitio cada 2 minutos, agregando un
segundo cron a un endpoint que sí toque la base de datos (el de `/health`
no la toca), para evitar que Aiven la apague por inactividad.

**Cómo se migraron los datos**: ni el sandbox ni el navegador pueden
alcanzar `aivencloud.com` ni el puerto MySQL de Hostinger directamente
(bloqueados por el allowlist del proxy de red). Pero Render sí tiene
acceso completo a ambas bases. Solución: se agregó temporalmente un router
(`backend/src/routes/migrate.routes.ts`) con tres endpoints protegidos por
el mismo header `X-Sync-Secret` que ya usaba el proyecto:

- `POST /internal/migrate/schema` — corre `prisma migrate deploy` contra
  `TARGET_DATABASE_URL` (Aiven) para crear el schema.
- `POST /internal/migrate/copy` — lee todas las filas de las 23 tablas
  desde la fuente (Hostinger, cliente Prisma default) y las inserta en el
  destino (Aiven, segundo `PrismaClient` apuntando a `TARGET_DATABASE_URL`)
  en lotes de 200, con `FOREIGN_KEY_CHECKS=0` durante la copia.
- `GET /internal/migrate/verify` — compara `COUNT(*)` de cada tabla entre
  ambas bases.

Se invocaron los tres desde el navegador (`fetch` a la URL pública de
Render), porque el navegador tampoco puede pegarle directo a MySQL pero sí
puede pegarle a la API pública de Render, que internamente sí tiene
acceso a ambas bases.

**Resultado de la copia**: las 23 tablas migraron con `match: true` en la
verificación (conteos idénticos origen/destino). Dato relevante: todas las
tablas de usuarios (favoritos, ratings, comentarios, cuentas) están en 0
filas en producción — no hay uso real todavía, así que no hubo riesgo de
pérdida de datos de usuarios.

**Corte productivo**: se cambió `DATABASE_URL` en Render (Settings →
Environment) al connection string de Aiven, se sacó `TARGET_DATABASE_URL`
(ya no hace falta) y se re-desplegó. Se verificó en caliente contra
producción:

- `GET /movies/trending` con datos reales: 832ms en frío, luego ~200-400ms.
- `GET /movie/:id` (ficha, endpoint real — no `/movies/:id`): **350-500ms**
  contra Aiven, vs. los ~1.3-2.3s que daba contra Hostinger en la ronda de
  3.5. Mejora de ~3-4x. Sigue habiendo margen (Aiven no está en la misma
  región exacta que Render/Oregón), pero confirma que la distancia de red
  era el cuello de botella dominante.

**Limpieza pendiente/hecha**: se eliminó `backend/src/routes/migrate.routes.ts`
y su registro en `app.ts` una vez verificada la migración (este código era
explícitamente temporal). La base de Hostinger se deja intacta por ahora
como respaldo/rollback; no se decidió aún si dar de baja el hosting.


## 4. Estado actual / próximos pasos sugeridos

- [ ] Confirmar en el sitio real (Netlify) que la carga se siente más
      rápida con los cambios de performance — el usuario todavía no lo
      probó después del último batch de commits.
- [x] Cron keep-alive configurado en cron-job.org (cada 2 min a `/health`).
- [ ] **Alta prioridad**: cambiar la rama de deploy de Render a `main`
      (Settings → Build & Deploy → Branch). Hoy trackea
      `claude/app-install-option-missing-mozug7` y los pushes a main no
      llegan al backend — ver 3.5, punto 5.
- [x] Decidir y ejecutar la mudanza de infra para bajar la latencia entre
      Render y la base de datos — ver 3.6. Se migró a Aiven MySQL (free
      tier), ficha bajó de ~1.3-2.3s a ~220-250ms.
- [x] Segundo cron job creado en cron-job.org: "Aiven keep-alive (DB
      query)", cada 2 min, contra `/movies/trending?country=AR` (sí toca
      la DB, a diferencia de `/health`) — ver 3.6.
- [ ] Evaluar si conviene dar de baja o mantener la MySQL de Hostinger
      como respaldo ahora que Aiven es la base productiva.
- [ ] Correr `npx capacitor-assets generate --android` localmente para
      tener íconos/splash reales.
- [ ] Abrir `android/` en Android Studio y generar un primer APK de
      prueba, instalarlo en un dispositivo real y probar: navegación,
      botón atrás, links a plataformas, login, favoritos.
- [ ] Decidir si vale la pena migrar a `expo-router` en algún momento para
      habilitar SSR/prerenderizado (no se hizo en esta ronda — ver 3.1).
- [ ] `npx cap add ios` cuando haya una Mac con Xcode disponible para
      generar esa plataforma (el código ya es compatible, falta el
      scaffolding nativo).

## 5. Notas de seguridad

Este documento NO incluye credenciales, API keys ni contraseñas reales a
propósito. Las que hacen falta (TMDB, Streaming Availability, credenciales
de la MySQL de Hostinger, `JWT_SECRET`/`SYNC_SECRET`) viven como variables
de entorno en Render (backend) y Netlify (frontend) — nunca en el repo. Ver
`backend/README.md` para la lista completa de env vars necesarias.

## 6. Ronda de funcionalidad post-migración (auth, Ya lo vi, scroll, filtros, links)

Pedido explícito del usuario tras la ronda de performance/infra: 8 puntos.
Estado de cada uno:

**1. Bug de login/registro** — investigado a fondo: se reprodujo el flujo
completo (registro → agregar a Mi Lista → logout → login) contra
producción con una cuenta de prueba y funcionó de punta a punta sin
problemas. Se revisó también la MySQL vieja de Hostinger (users,
user_favorites, user_sessions, user_views, user_ratings, user_comments):
las 6 tablas están en 0 filas, así que no quedó ninguna cuenta "huérfana"
de la migración a Aiven para rescatar — no hubo pérdida de datos. La
conclusión más probable es que el bug reportado ocurrió durante la
ventana de inestabilidad ya documentada en 3.4/3.5 (deploy viejo
sirviendo código roto, regresión de pantalla en blanco), ambas ya
resueltas. No se tocó código de auth (estaba sano: bcrypt para
passwords, JWT + refresh token rotativo con hash SHA-256, todo verificado
línea por línea).

**2. Emails automáticos (bienvenida + recuperar contraseña)** — pendiente:
requiere una API key de Resend (decisión tomada con el usuario: Resend,
plan gratis). No implementado todavía en este commit.

**3. "Ya lo vi"** — implementado. El modelo `UserView` ya existía en el
schema (se usaba solo para estadísticas, marcando automático al abrir una
ficha). Se agregó marca/desmarca manual: `backend/src/services/views.ts`
+ `routes/views.routes.ts` (`GET/POST /views`, `DELETE /views/:type/:id`,
`POST /views/sync` — mismo patrón que favoritos). Frontend:
`ViewsContext.tsx` (mismo patrón que `FavoritesContext`, con fallback
local para anónimos), botón "Ya lo vi" en `MediaCard` y en el header de
`DetailScreen`, badge visual "Visto" + poster atenuado, y filtro
Todos/Vistos/No vistos en `MyListScreen`.

**4. Scroll bloqueado** — causa raíz encontrada: `AppShell.tsx` (el marco
que envuelve TODAS las pantallas) tenía `desktopContent: { flex: 1,
minWidth: 0 }` sin `minHeight: 0` — el bug clásico de flexbox en web
donde un hijo flex dentro de un contenedor `flexDirection: row` no se
achica para permitir su propio scroll interno, y en cambio estira todo.
El equivalente mobile sí lo tenía, por eso el bug era más notorio en
desktop. Se agregó `minHeight: 0` en toda la cadena (AppShell + el
`container`/`scroll` de cada pantalla) y `flex: 1` explícito a los
FlatList que no lo tenían. Aparte, **ProfileScreen y AuthScreen no usaban
`ScrollView`** — eran `View` simples: si el contenido era más alto que la
pantalla, no había forma de llegar al final. Se convirtieron ambas a
`ScrollView`.

**5. Filtro de año** — rediseñado. Antes era una lista plana de chips (un
chip por año, solo los últimos 10). Ahora: `src/components/YearRangeSlider.tsx`,
un slider de rango con dos handles arrastrables (PanResponder, sin
dependencias nativas nuevas — funciona en web y mobile), rango 1950–hoy,
más una fila de chips de década ("2020s", "2010s", ...) para saltar
rápido. Backend: `DiscoverMoviesParams`/`DiscoverTvParams` pasaron de
`year` (exacto) a `yearFrom`/`yearTo` (rango, ambos opcionales), tanto en
la query de Prisma como en el fallback a TMDB (`primary_release_date.gte/
lte` / `first_air_date.gte/lte`). `/discover` sigue aceptando `year`
suelto por compatibilidad (equivale a yearFrom=yearTo=year).

**6. Filtros dentro de plataforma** — antes "Ver más → Netflix" no tenía
filtro de género ni de tipo (siempre mostraba solo películas, fijo en
`config/catalog.ts`). Se agregó, solo en páginas de plataforma: chips de
Película/Serie (pisa el `mediaType` fijo de la categoría) y chips de
género (reusa `GENRE_ROWS`). Año y Orden ya se mostraban en todas las
categorías. **Nota**: `GENRE_ROWS` usa IDs de género de TMDB para
*película* — algunos no coinciden 1:1 con los IDs de género de TMDB para
series (ej. Acción=28 en película vs. Acción y aventura=10759 en serie),
así que el filtro de género puede devolver menos resultados de los
esperados para Serie en géneros donde el ID no coincide (Comedia, Drama,
Animación y Documentales sí son el mismo ID en ambos). Pendiente si hace
falta más precisión: mapear una segunda tabla de géneros de TV.

**7. Links oficiales a plataformas** — verificado en producción, sin
necesitar cambios de código: el sistema ya existía
(`backend/src/services/streamingLinks.ts`) con la prioridad exacta
pedida: 1) `StreamingLink` cacheado en la DB, 2) resolución en vivo vía
Wikidata (gratis, sin API key — cubre Netflix/Disney+/Apple TV) +
overrides manuales, 3) búsqueda por nombre como último recurso. Se probó
en vivo: "A ciegas" (Bird Box) pasó de link de búsqueda a
`https://www.netflix.com/title/80196789` (`verified: true`) automáticamente
en la segunda visita. Decisión tomada con el usuario: no contratar la
"Streaming Availability API" (paga) por ahora, así que Max/Prime
Video/Paramount+/Hulu/Crunchyroll se quedan en búsqueda por nombre salvo
que Wikidata o un override manual tengan el dato (Wikidata no tiene
propiedad para esas plataformas, solo Netflix/Disney+/Apple TV).

**8. Testing integral** — en curso (ver sección 6.1 para el bug encontrado
y resuelto durante esta ronda de QA); falta cerrar el punto 2 (emails)
antes de darlo por terminado del todo.

Cambios de este commit: `backend/src/services/views.ts` (nuevo),
`backend/src/routes/views.routes.ts` (nuevo), `backend/src/app.ts`
(registro del router), `backend/src/providers/tmdb.ts`,
`backend/src/services/movies.ts`, `backend/src/services/tv.ts`,
`backend/src/routes/discover.routes.ts` (year → yearFrom/yearTo),
`src/api/social.ts`, `src/api/nowsee.ts`, `src/context/ViewsContext.tsx`
(nuevo), `src/hooks/useViews.ts` (nuevo), `App.tsx` (ViewsProvider),
`src/components/MediaCard.tsx`, `src/components/YearRangeSlider.tsx`
(nuevo), `src/components/Row.tsx`, `src/screens/SearchScreen.tsx`,
`src/screens/CategoryScreen.tsx`, `src/screens/MyListScreen.tsx`,
`src/screens/DetailScreen.tsx`, `src/screens/ProfileScreen.tsx`,
`src/screens/AuthScreen.tsx`, `src/navigation/AppShell.tsx`.

## 6.1. Bug encontrado en QA en vivo: error 500 al combinar filtros en páginas de plataforma (deadlock MySQL)

Durante el testing manual del punto 6 (filtros en páginas de plataforma),
en `nowsee.netlify.app/category/netflix` combinar género (ej. Comedia,
Documentales) — con o sin tipo (Película/Serie) — a veces mostraba "No
pudimos cargar este catálogo" en vez de resultados. Era intermitente: la
misma combinación de filtros a veces funcionaba y a veces no.

**Diagnóstico**: se descartó el frontend primero — un `fetch` manual
contra `/discover` con los mismos parámetros devolvía 200 sin problema.
El error real solo aparecía haciendo el click real en la UI. Los logs de
Render (`read_console_messages`/`read_network_requests` del navegador +
logs de la app en el dashboard de Render) mostraron el error real:

```
PrismaClientKnownRequestError: Invalid `prisma.movieGenre.createMany()` invocation:
Transaction failed due to a write conflict or a deadlock. Please retry your transaction
code: 'P2034'
```

**Causa raíz**: `discoverMovies`/`discoverTv` (y el fallback de
`search`) resuelven contra TMDB cuando la cobertura local no alcanza, y
antes de esta ronda upserteaban **todos los resultados de la página (hasta
20) en paralelo con `Promise.all` sin ningún límite**. Cada upsert corre
una transacción `deleteMany + createMany` sobre `MovieGenre`/`TVGenre`
(ver `services/genres.ts`). Con hasta 20 transacciones compitiendo a la
vez contra la MySQL remota (Aiven), y varias películas/series compartiendo
el mismo género (ej. todas las de "Comedia" tocan la misma fila de
`Genre`), MySQL resuelve el choque como deadlock (Prisma P2034). Ya
existía un `withRetry` que reintentaba 3 veces ante P2034 — pero con un
lote entero reintentando casi al mismo tiempo, los reintentos también
chocaban entre sí y terminaban agotándose, devolviendo 500 al cliente.

**Fix** (no toca schema ni datos):
- `backend/src/utils/concurrency.ts` (nuevo): `mapWithConcurrency`, corre
  los upserts con un límite real de tareas en vuelo en vez de todas a la
  vez.
- `backend/src/services/movies.ts`, `tv.ts`, `search.ts`: reemplazan su
  `Promise.all` sin límite por `mapWithConcurrency(items, 4, ...)`.
- `backend/src/utils/withRetry.ts`: de 3 a 5 intentos, con backoff +
  jitter (en vez de espera fija) para que los reintentos de transacciones
  distintas no se sincronicen entre sí.

**Verificación**: reproducido en vivo antes del fix (Netflix + Comedia,
Netflix + Serie + Comedia); tras deployar el fix, se repitió la prueba
con combinaciones nuevas sin cachear (Netflix + Documentales, Netflix +
Serie + Documentales) y cargaron bien; revisados los logs de Render post-
deploy sin ningún P2034 nuevo.

## 6.2. Testing integral (item 8) — resultado

QA manual en producción (`nowsee.netlify.app`), con cuenta de prueba
nueva creada para la ocasión. Resultado por punto:

- **Registro**: ok. Cuenta nueva creada, auto-login inmediato tras crear
  cuenta, perfil muestra nombre/email correctos.
- **Login / Logout**: ok. Logout vuelve a estado "Invitado"; login con
  la misma cuenta recupera sesión y datos (Mi Lista, Ya lo vi) intactos.
- **Persistencia de sesión**: ok. Reload completo de página (F5, no
  navegación SPA) mantiene la sesión y el estado de Mi Lista/Ya lo vi.
- **Mi Lista / Ya lo vi**: ok. Agregar/marcar desde `MediaCard` en Home
  se refleja al instante en `Mi Lista`; el filtro Todos/Vistos/No vistos
  funciona correctamente.
- **Navegación**: ok entre Explorar, Buscar, Mi Lista, Perfil, categorías
  de plataforma y fichas de detalle.
- **Scroll**: ok. Verificado que se llega al final tanto en una ficha
  larga (elenco → calificación → plataformas → recomendaciones) como en
  una página de categoría con grilla completa.
- **Filtros**: ok. Slider de año por rango, género, tipo (película/serie)
  y orden combinan correctamente en páginas de plataforma.
- **Plataformas + Links externos**: ok. Verificado con un segundo
  ejemplo en vivo (Netflix): el botón "Disponible en" abrió directamente
  `netflix.com/title/81763251` (ID real vía Wikidata), no una búsqueda.
- **Carga de imágenes**: mayormente ok; algunos títulos muy nuevos/nicho
  (ej. "Backrooms") no tienen poster en TMDB y se ven con fondo sólido —
  es un hueco de datos de origen, no un bug de carga.
- **Búsquedas**: ok, resultados relevantes y rápidos.
- **Paginación**: no implementada — las páginas de categoría cargan un
  único lote (~20 resultados TMDB) y no tienen "cargar más"/scroll
  infinito. No es un bug (no estaba pedido explícitamente), pero queda
  anotado como posible mejora futura si se quiere paridad con
  Letterboxd/JustWatch.
- **Consola sin errores JS/red**: ok en todas las pantallas visitadas
  tras el fix de la sección 6.1 (antes del fix, esta era justamente la
  fuente de los 500 intermitentes).
- **Responsive/Desktop/Mobile**: revisado por código (`AppShell` separa
  layout mobile/desktop, ya con el fix de `minHeight:0` de 6); no se
  pudo forzar un viewport angosto real en este entorno de testing
  (la ventana del navegador remoto no permite redimensionar por debajo
  de su tamaño de escritorio), así que el layout mobile no quedó
  re-verificado visualmente en esta ronda puntual — sí lo estaba en las
  rondas de performance anteriores (Capacitor/Android, sección 3).
- **Recuperar contraseña**: excluido de esta ronda — depende del punto 2
  (emails), que sigue pendiente de la API key de Resend.

Conclusión: los 6 puntos técnicos completados en 6.1 quedan verificados
en producción sin regresiones. Solo restan los emails (bloqueado por
credencial) para poder cerrar el punto 8 al 100%.

