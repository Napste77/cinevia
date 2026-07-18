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

## 4. Estado actual / próximos pasos sugeridos

- [ ] Confirmar en el sitio real (Netlify) que la carga se siente más
      rápida con los cambios de performance — el usuario todavía no lo
      probó después del último batch de commits.
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
