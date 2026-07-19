# NowSee

Plataforma de descubrimiento de cine y series, instalable como PWA. Muestra
tendencias globales, catálogos por plataforma de streaming y por género, con
búsqueda instantánea y fichas de detalle completas (sinopsis, reparto,
tráiler y dónde verlo con deep link directo a la app).

## Arquitectura

El frontend (este repo, en la raíz) **no habla con TMDB ni con ninguna API
externa**: consume únicamente la API propia de NowSee, en `backend/`. Ese
backend es el que consulta TMDB/Wikidata/Streaming Availability, normaliza
los datos y los guarda en una base MySQL propia — la fuente real de
información de la app, que se completa y actualiza sola con jobs de
sincronización (diario/semanal/mensual) y bajo demanda cuando alguien pide
algo que todavía no existe. Ver `backend/README.md` para el detalle
completo (schema, endpoints, jobs, deploy en Hostinger).

```
Usuarios (Web / Android / iOS)
        │
   API NowSee (backend/)
        │
  Base de datos NowSee (MySQL)
        │
 TMDB · Wikidata · Streaming Availability API
```

## Setup

```bash
# 1. Instalar dependencias del frontend
npm install

# 2. Levantar el backend (ver backend/README.md para el setup completo:
#    requiere MySQL + una API key de TMDB, ninguna de las dos las toca
#    este proyecto directamente)
cd backend && npm install && npm run dev   # API en http://localhost:4000

# 3. Apuntar el frontend a esa API
#    - Copiá .env.example a .env en la raíz del repo
#    - Completá EXPO_PUBLIC_API_BASE_URL (http://localhost:4000 en dev)

# 4. Correr el frontend en modo web
npx expo start --web
```

## Deploy a Netlify

El repo ya trae `netlify.toml` con el build command y carpeta de publish
correctos:

```toml
[build]
  command = "npx expo export --platform web --source-maps"
  publish = "dist"
```

Pasos:

```bash
npx netlify login
npx netlify init      # o `netlify link` si ya existe el site
npx netlify deploy --prod
```

Variable de entorno a configurar en Netlify (Site settings → Environment
variables):

- `EXPO_PUBLIC_API_BASE_URL` → la URL pública del backend ya deployado
  (ver `backend/README.md` para desplegarlo en Hostinger).

## Qué incluye

- **Home dinámico**: tendencias globales (películas y series), filas por
  plataforma (Netflix, Disney+, Prime Video, Max, Apple TV+, Paramount+,
  Crunchyroll) y filas por género (Acción, Ciencia ficción, Comedia, Terror,
  Drama, Animación, Documentales), cada una con botón "Ver más" a su
  catálogo completo con scroll infinito.
- **Buscador instantáneo** de películas y series mientras se escribe.
- **Ficha de detalle**: poster, banner, sinopsis, géneros, año, duración,
  rating, reparto principal, tráiler embebido, recomendaciones similares y
  botones "Disponible en" con deep link directo a cada plataforma.
- **Mi Lista**: favoritos guardados localmente en el dispositivo.
- **Navegación responsive**: sidebar fijo en desktop, barra inferior en
  mobile; el botón "Atrás" del navegador/dispositivo navega el historial
  interno de la app (no sale del sitio).
- **PWA instalable** en Android, iOS y escritorio (ver más abajo).
- Diseño propio ("Cinematic Neo-Noir") inspirado en plataformas premium
  de streaming, con tipografías Sora/Inter y estética glassmórfica.

## PWA

- `public/manifest.webmanifest`, `public/sw.js` y `public/icons/*` (más
  `public/index.html`, que reemplaza la plantilla HTML por defecto de Expo)
  arman la instalabilidad: manifest válido, service worker con fetch
  handler, e íconos 192/512 (`any` + `maskable`) y apple-touch-icon.
- El Service Worker precachea el shell (`/`, manifest, íconos) y cachea en
  tiempo de ejecución los assets con hash que genera Metro (JS/CSS/fuentes),
  así que la interfaz sigue cargando offline. Las llamadas a la API de
  NowSee no se cachean (solo necesitamos que la interfaz ande sin conexión,
  no los datos).
- En Chrome/Edge/Android aparece el botón "Instalar aplicación" (pantalla de
  Perfil) apenas el navegador dispara `beforeinstallprompt`. En iOS Safari,
  que no tiene ese evento, se muestra la instrucción de "Compartir → Agregar
  a pantalla de inicio"; si ningún navegador lo ofrece automáticamente
  (algunos Android con ROMs personalizadas), se muestra igual un cartel con
  instrucciones para instalar manualmente desde el menú.

## Capacitor / APK de Android

Una sola base de código para web, PWA y Android: Capacitor empaqueta el
MISMO build web (`expo export --platform web`, el mismo `dist/` que se
sube a Netlify) dentro de un WebView nativo — no hay un proyecto Android
separado que mantener aparte, ni pantallas duplicadas.

```bash
# 1. Buildear el bundle web apuntando al backend de PRODUCCIÓN (no
#    localhost — el APK no va a poder resolver "localhost" en el
#    teléfono de un usuario real).
EXPO_PUBLIC_API_BASE_URL=https://nowsee-api.onrender.com \
  npx expo export --platform web --clear

# 2. Copiar ese build al proyecto nativo de Android (carpeta android/,
#    ya generada y versionada en el repo).
npx cap sync android

# 3. Abrir el proyecto en Android Studio y generar el APK/AAB desde ahí
#    (Build → Generate Signed Bundle / APK). Este repo no compila el APK
#    por sí solo: hace falta Android Studio (o el SDK + Gradle) instalado
#    localmente.
npx cap open android
```

Detalles de la integración (ver `src/api/deepLinks.ts` y `App.tsx`):

- **`Platform.OS` sigue siendo `"web"` adentro del WebView** (react-native-web
  no sabe que está empaquetado) — todo el código que necesita distinguir
  "de verdad es un navegador" de "es la app empaquetada" usa
  `Capacitor.isNativePlatform()` en su lugar (deep links, botón de instalar
  PWA, registro del service worker).
- **Botón "Atrás" de Android**: conectado a mano al historial de React
  Navigation (`@capacitor/app`) — navega hacia atrás en la app mientras
  haya historial, y recién cierra la app cuando no queda nada atrás.
- **Links a plataformas de streaming**: se abren con `@capacitor/browser`
  (Chrome Custom Tabs / SFSafariViewController) en vez de navegar el
  WebView de la app hacia el sitio externo — si no, el usuario quedaría
  "atrapado" viendo netflix.com sin volver a NowSee.
- **Service worker**: no se registra dentro de Capacitor (no aporta nada —
  los assets ya viven empaquetados en el APK, no hace falta cachearlos de
  nuevo).
- **Splash screen y barra de estado**: color de fondo `#0c1324` (el mismo
  del tema oscuro de la app) configurado en `capacitor.config.ts` y en
  `App.tsx`.
- **CORS**: el backend ya permite cualquier origen (`cors()` sin
  restricciones), así que el WebView (`https://localhost` por defecto en
  Capacitor) funciona sin cambios adicionales.

### Ícono y splash reales (pendiente de generar)

`resources/icon.png` (1024×1024, el mismo `assets/icon.png` de la app) ya
está listo para generar los íconos adaptativos y la pantalla de splash de
verdad. Ese paso necesita la librería `sharp` (vía `@capacitor/assets`),
que este entorno no pudo instalar por restricciones de red del sandbox —
correrlo desde una máquina con acceso normal a internet:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --android
npx cap sync android
```

Hasta que se corra ese paso, el APK compila y funciona correctamente, pero
el ícono del launcher y la pantalla de splash muestran el placeholder
genérico de Capacitor en vez del logo de NowSee.

### iOS (a futuro)

La misma base ya queda lista: `npx cap add ios` genera el proyecto nativo
de iOS a partir del mismo `dist/`, con el mismo `capacitor.config.ts` y las
mismas correcciones de compatibilidad (Capacitor detecta la plataforma
automáticamente). Falta scaffolding específico (`ios/`) y una Mac con
Xcode para compilarlo, así que no se generó en esta pasada.

## Deep links a plataformas de streaming

La resolución de deep links (Wikidata + Streaming Availability API +
overrides manuales + búsqueda de fallback) vive enteramente en el backend
(`backend/src/services/streamingLinks.ts` y `backend/src/providers/`) y se
cachea en la tabla `streaming_links`. El frontend solo recibe, por cada
plataforma donde está disponible un título, una URL ya resuelta y lista
para abrir (`ProviderBadge` + `src/api/deepLinks.ts`) — no conoce Wikidata
ni la Streaming Availability API. Ver `backend/README.md` para el detalle
de cómo se resuelve y se cachea cada link.

El resultado siempre es una URL https normal (nunca un scheme custom tipo
`nflx://`). En un dispositivo con la app instalada, el sistema operativo
intercepta esa URL vía Universal Links (iOS) / App Links (Android) y abre
la app directo en la ficha exacta. Si no está instalada, carga la web tal
cual.

## Stack

**Frontend**: Expo (React Native + react-native-web), TypeScript, React
Navigation, Axios contra la API propia de NowSee. Deploy como sitio
estático PWA en Netlify. Empaquetado como APK de Android vía Capacitor
(mismo build web, ver sección "Capacitor / APK de Android" arriba).

**Backend** (`backend/`): Node.js + TypeScript + Express + Prisma sobre
MySQL. Ver `backend/README.md`.

## Limitaciones conocidas

1. **No hay autoplay real.** Ninguna plataforma permite que una app de
   terceros arranque la reproducción de un título directamente — como
   máximo abren la app en la ficha (o en el buscador si no hay un ID
   nativo cargado). Es una limitación de las plataformas, no del código.
2. **Deep links exactos dependen de que Wikidata (o, si está configurada,
   la Streaming Availability API) tenga documentado ese título en esa
   plataforma puntual.** Cuando falta, cae a un override manual y por
   último a la búsqueda dentro de la plataforma (que igual abre la app si
   está instalada, solo que sin apuntar directo a la ficha).
3. **País por defecto AR**, tanto en el backend (sync jobs) como en el
   frontend. Para producción conviene sumar geo-IP o un selector manual de
   región (ver limitaciones en `backend/README.md`).
4. **Datos de providers vienen de TMDB/JustWatch.** Es gratis pero puede
   tener algún desfasaje respecto al catálogo real de cada plataforma.
5. **Sin login ni cuentas propias.** "Mi Lista" se guarda solo en el
   dispositivo (AsyncStorage), no hay sincronización entre dispositivos —
   el schema del backend ya deja lugar para sumar esto (usuarios,
   favoritos, historial) sin rediseñar nada existente.

## Próximos pasos sugeridos

- Cuentas de usuario y sincronización de favoritos/listas entre
  dispositivos (el backend ya tiene base de datos propia para apoyar esto).
- Selector de país manual + geo-IP automático, sincronizando el catálogo
  por región en vez de una sola región fija.
- Recomendaciones con IA sobre los datos ya centralizados en la base
  propia (hoy `similar_content` se llena con las recomendaciones de TMDB,
  pero está pensado para poder alimentarse de un motor propio a futuro).
- Notificaciones push de nuevos estrenos por plataforma favorita.
- Monetización (suscripción Premium, publicidad) apoyada en la misma base
  de usuarios/analíticas.
