/**
 * Service worker de NowSee.
 *
 * Estrategia: precachea el shell de la app (HTML raíz, manifest, íconos) y
 * cachea en tiempo de ejecución los assets estáticos con hash que genera
 * Metro (JS/CSS/fuentes bajo /_expo/ y /assets/), ya que sus nombres de
 * archivo cambian en cada build y no se pueden conocer de antemano.
 *
 * Las llamadas a la API de TMDB (cross-origin) se dejan pasar directo a la
 * red: solo necesitamos que la INTERFAZ funcione offline, no los datos.
 */
const VERSION = "v1";
const SHELL_CACHE = `nowsee-shell-${VERSION}`;
const RUNTIME_CACHE = `nowsee-runtime-${VERSION}`;

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navegaciones (SPA): red primero, y si falla (offline) servimos el shell cacheado.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/", { ignoreSearch: true }))
    );
    return;
  }

  if (!isSameOrigin) {
    // Cross-origin (TMDB, YouTube, imágenes de posters, etc.): directo a la red.
    return;
  }

  // Assets estáticos propios (bundle JS/CSS con hash, fuentes, íconos):
  // cache-first, y si no está cacheado lo pedimos y lo guardamos para la próxima.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
