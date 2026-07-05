# Cinevia

Plataforma de descubrimiento de cine y series. Muestra tendencias globales,
catálogos por plataforma de streaming y por género, con búsqueda instantánea
y fichas de detalle completas (sinopsis, reparto, tráiler y dónde verlo).

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
  command = "npx expo export --platform web"
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
  rating, reparto principal, tráiler embebido y plataformas donde verla,
  más recomendaciones similares.
- **Mi Lista**: favoritos guardados localmente en el dispositivo.
- **Navegación responsive**: sidebar fijo en desktop, barra inferior en
  mobile.
- Diseño propio ("Cinematic Neo-Noir") inspirado en plataformas premium
  de streaming, con tipografías Sora/Inter y estética glassmórfica.

## Stack

Expo (React Native + react-native-web), TypeScript, React Navigation,
Axios contra la API de TMDB. Deploy como sitio estático en Netlify.

## Limitaciones conocidas

1. **No hay autoplay real.** Ninguna plataforma (Netflix, Prime, Disney+,
   etc.) permite que una app de terceros abra un título específico y
   arranque la reproducción. Los deep links como máximo abren la app en
   su home — es una limitación de las plataformas, no del código.
2. **País por defecto AR.** Para producción conviene sumar geo-IP o un
   selector manual de país/región.
3. **Datos de providers vienen de TMDB/JustWatch.** Es gratis pero puede
   tener algún desfasaje respecto al catálogo real de cada plataforma.
4. **Sin login ni cuentas propias.** "Mi Lista" se guarda solo en el
   dispositivo (AsyncStorage), no hay sincronización entre dispositivos.

## Próximos pasos sugeridos

- Selector de país manual + geo-IP automático.
- Backend propio con cache (para no pegarle a TMDB en cada request).
- Cuentas de usuario y sincronización de favoritos.
- Notificaciones push de nuevos estrenos por plataforma favorita.
