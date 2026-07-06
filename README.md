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

# 3. Correr en modo web
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
variables), la misma que en tu `.env` local:

- `EXPO_PUBLIC_TMDB_API_KEY`

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

Arquitectura en tres piezas, para que el resto de la app no conozca ningún
detalle de cada plataforma:

- `src/config/streamingPlatforms.ts`: la capa de abstracción (nombre, color,
  provider id de TMDB, plantilla de universal link, búsqueda de fallback).
- `src/data/streamingLinkOverrides.ts`: mapeo manual `tmdbId -> URL real`
  para títulos puntuales, sin tocar componentes ni pantallas. Pensado para
  escalar: el día que haga falta, `getStreamingLinkOverrides()` puede pasar
  a leer de una fuente remota (hoja de cálculo publicada, CMS, backend) y
  nada más en la app cambia.
- `src/api/streamingLinks.ts`: el resolver — usa el override si existe, si
  no cae a la búsqueda dentro de la plataforma.

El resultado siempre es una URL https normal (nunca un scheme custom tipo
`nflx://`). En un dispositivo con la app instalada, el sistema operativo
intercepta esa URL vía Universal Links (iOS) / App Links (Android) y abre
la app directo — el mismo mecanismo que usa un link compartido oficialmente
desde la propia plataforma. Si no está instalada, carga la web tal cual. No
hace falta ninguna lógica de "detectar instalación + fallback": lo maneja el
SO. Validado en la práctica: al no haber override cargado para un título,
cae a la búsqueda (`netflix.com/search?q=...`) y Netflix responde con un
redirect real a esa búsqueda, confirmando que la URL es válida para su
propio backend.

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
2. **Deep links con ID nativo real**: solo funcionan para los títulos
   cargados en `streamingLinkOverrides.ts` (no existe ninguna API pública
   que devuelva el ID interno de Netflix/Disney+/etc. a partir del ID de
   TMDB). El resto cae a la búsqueda dentro de la plataforma, que también
   abre la app si está instalada.
3. **País por defecto AR.** Para producción conviene sumar geo-IP o un
   selector manual de país/región.
4. **Datos de providers vienen de TMDB/JustWatch.** Es gratis pero puede
   tener algún desfasaje respecto al catálogo real de cada plataforma.
5. **Sin login ni cuentas propias.** "Mi Lista" se guarda solo en el
   dispositivo (AsyncStorage), no hay sincronización entre dispositivos.

## Próximos pasos sugeridos

- Cargar overrides de deep links para el catálogo más popular (o mudar
  `streamingLinkOverrides` a una fuente remota editable sin deploy).
- Selector de país manual + geo-IP automático.
- Backend propio con cache (para no pegarle a TMDB en cada request).
- Cuentas de usuario y sincronización de favoritos.
- Notificaciones push de nuevos estrenos por plataforma favorita.
