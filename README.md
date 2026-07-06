# NowSee

Plataforma de descubrimiento de cine y series, instalable como PWA. Muestra
tendencias globales, catálogos por plataforma de streaming y por género, con
búsqueda instantánea y fichas de detalle completas (sinopsis, reparto,
tráiler y dónde verlo con deep link directo a la app).

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Poner tu API key de TMDB
#    - Conseguila gratis en https://www.themoviedb.org/settings/api
#    - Copiá .env.example a .env y completá EXPO_PUBLIC_TMDB_API_KEY

# 3. No hace falta nada más para los deep links: Wikidata (la fuente
#    principal) es pública y no usa API key.

# 4. (opcional) API key de Streaming Availability, para cubrir además
#    Prime Video/Max/Paramount+/Hulu/Crunchyroll (Wikidata no los tiene):
#    - Suscribite gratis (sin tarjeta) en:
#      https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability
#    - Copiá el valor de "X-RapidAPI-Key" a EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY

# 5. Correr en modo web
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

Variables de entorno a configurar en Netlify (Site settings → Environment
variables), las mismas que en tu `.env` local:

- `EXPO_PUBLIC_TMDB_API_KEY`
- `EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY`

## Qué incluye

- **Home dinámico**: tendencias globales (películas y series), filas por
  plataforma (Netflix, Disney+, Prime Video, Max, Apple TV+, Paramount+,
  Crunchyroll) y filas por género (Acción, Ciencia ficción, Comedia, Terror,
  Drama, Animación, Documentales), todo actualizado desde TMDB.
- **Buscador instantáneo** de películas y series mientras se escribe.
- **Ficha de detalle**: poster, banner, sinopsis, géneros, año, duración,
  rating, reparto principal, tráiler embebido, recomendaciones similares y
  botones "Disponible en" con deep link directo a cada plataforma.
- **Mi Lista**: favoritos guardados localmente en el dispositivo.
- **Navegación responsive**: sidebar fijo en desktop, barra inferior en
  mobile.
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
  así que la interfaz sigue cargando offline. Las llamadas a TMDB no se
  cachean (solo necesitamos que la interfaz ande sin conexión, no los datos).
  Confirmado con Chrome (`Page.getInstallabilityErrors` → 0 errores) y con
  una recarga en modo offline real.
- En Chrome/Edge/Android aparece el botón "Instalar aplicación" (pantalla de
  Perfil) apenas el navegador dispara `beforeinstallprompt`. En iOS Safari,
  que no tiene ese evento, se muestra la instrucción de "Compartir → Agregar
  a pantalla de inicio".

## Deep links a plataformas de streaming

Arquitectura en capas, para que el resto de la app no conozca ningún detalle
de cada plataforma:

- `src/config/streamingPlatforms.ts`: la capa de abstracción (nombre, color,
  provider id de TMDB, plantilla de universal link, búsqueda de fallback).
- `src/api/wikidataStreamingIds.ts`: **fuente principal, 100% gratis y sin
  límite.** [Wikidata](https://www.wikidata.org) es dato abierto (CC0) y
  mantiene propiedades con el ID real de cada título en Netflix (P1874),
  Disney+ (P7595/P7596) y Apple TV (P9586/P9751), cruzables por el ID de
  TMDB (P4947/P4983). Sin API key, sin cuota, sin costo — a diferencia de
  cualquier "free tier" comercial, esto no tiene techo que se vaya a topar
  si NowSee crece. Cachea 90 días (memoria + AsyncStorage). Cobertura real
  pero parcial (depende de qué haya documentado la comunidad, y todavía no
  cubre Prime Video/Max/Paramount+/Hulu/Crunchyroll).
- `src/api/streamingAvailability.ts`: cliente opcional de la
  [Streaming Availability API](https://www.movieofthenight.com/about/api)
  (vía RapidAPI, free tier 100 req/día) — rellena las plataformas que
  Wikidata no cubre. Requiere `EXPO_PUBLIC_STREAMING_AVAILABILITY_API_KEY`;
  sin ella la app funciona igual, solo con menos cobertura en esas
  plataformas puntuales. Es una mejora incremental para cuando el
  producto genere ingresos, no una dependencia obligatoria.
- `src/data/streamingLinkOverrides.ts`: mapeo manual `tmdbId -> URL real`
  para casos puntuales que ninguna de las dos fuentes anteriores resuelva.
  Pensado para escalar: el día que haga falta, puede pasar a leer de una
  fuente remota (hoja de cálculo publicada, CMS, backend) sin tocar el
  resto de la app.
- `src/api/streamingLinks.ts`: el resolver, en este orden de prioridad:
  1. Wikidata (gratis).
  2. Streaming Availability API (si está configurada).
  3. Override manual.
  4. Último recurso: búsqueda del título dentro de la plataforma.

**Validado con casos reales** (Argentina): "Atrapados" → Netflix
`netflix.com/title/81580367` (el ID exacto), "Stranger Things" → Netflix
`netflix.com/title/80057281`, "Breaking Bad" → Netflix
`netflix.com/title/70143836` — los tres resueltos 100% gratis vía
Wikidata, sin ninguna API paga. "Oppenheimer" cayó al fallback de
búsqueda porque Wikidata tiene documentado su ID de Apple TV pero
todavía no el de Netflix para ese título puntual — es un hueco de
cobertura de los datos (comunitarios, van creciendo con el tiempo), no
un bug del código.

El resultado siempre es una URL https normal (nunca un scheme custom tipo
`nflx://`). En un dispositivo con la app instalada, el sistema operativo
intercepta esa URL vía Universal Links (iOS) / App Links (Android) y abre
la app directo en la ficha exacta — el mismo mecanismo que usa un link
compartido oficialmente desde la propia plataforma. Si no está instalada,
carga la web tal cual. No hace falta ninguna lógica de "detectar
instalación + fallback": lo maneja el SO.

**Sobre el link "compartido oficial"**: los links que genera el botón
Compartir de cada plataforma (ej. el de Netflix con `shareUuid`, `trkid`,
etc.) llevan parámetros de tracking efímeros que la plataforma genera por
sesión — no hay forma de reconstruirlos desde afuera ni una API que los
devuelva. La URL canónica (`netflix.com/title/{id}`) logra el mismo
resultado (abre la app) porque es la misma Universal Link registrada, sin
esos parámetros de tracking.

## Stack

Expo (React Native + react-native-web), TypeScript, React Navigation,
Axios contra la API de TMDB. Deploy como sitio estático PWA en Netlify.

## Limitaciones conocidas

1. **No hay autoplay real.** Ninguna plataforma permite que una app de
   terceros arranque la reproducción de un título directamente — como
   máximo abren la app en la ficha (o en el buscador si no hay un ID
   nativo cargado). Es una limitación de las plataformas, no del código.
2. **Deep links exactos dependen de que Wikidata (o, si está configurada,
   la Streaming Availability API) tenga documentado ese título en esa
   plataforma puntual.** Es cobertura real pero no 100% para absolutamente
   todo el catálogo — cuando falta, cae a `streamingLinkOverrides.ts` y
   por último a la búsqueda dentro de la plataforma (que igual abre la
   app si está instalada, solo que sin apuntar directo a la ficha). La
   cobertura de Wikidata la mantiene su comunidad y crece con el tiempo;
   para títulos puntuales de alto tráfico conviene cargar un override
   manual verificado.
3. **País por defecto AR.** Para producción conviene sumar geo-IP o un
   selector manual de país/región.
4. **Datos de providers vienen de TMDB/JustWatch.** Es gratis pero puede
   tener algún desfasaje respecto al catálogo real de cada plataforma.
5. **Sin login ni cuentas propias.** "Mi Lista" se guarda solo en el
   dispositivo (AsyncStorage), no hay sincronización entre dispositivos.

## Próximos pasos sugeridos

- Cargar overrides manuales verificados para el catálogo de mayor
  tráfico (los títulos que Wikidata todavía no documenta).
- Si más adelante conviene sumar la Streaming Availability API (u otra
  paga) para más cobertura, mover el cache a compartido entre usuarios
  (hoy es por dispositivo) estira mucho más cualquier free tier.
- Selector de país manual + geo-IP automático.
- Backend propio con cache (para no pegarle a TMDB en cada request).
- Cuentas de usuario y sincronización de favoritos.
- Notificaciones push de nuevos estrenos por plataforma favorita.
