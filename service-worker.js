/* Service worker : app shell entièrement mise en cache pour un fonctionnement 100% hors ligne.
   Stratégie : stale-while-revalidate (affichage instantané depuis le cache, mise à jour en tâche de fond). */
const CACHE_VERSION = "s3k-v3";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.json",
  "css/main.css",
  "css/layout.css",
  "css/components.css",
  "css/mobile.css",
  "js/app.js",
  "js/router.js",
  "js/state.js",
  "js/services/storage.js",
  "js/services/searchEngine.js",
  "js/services/theme.js",
  "js/components/personas.js",
  "js/components/hooks.js",
  "js/components/objections.js",
  "js/components/diagnostics.js",
  "js/components/qualification.js",
  "js/components/questions.js",
  "js/components/fiche.js",
  "js/components/dashboard.js",
  "js/components/callMode.js",
  "js/components/mission.js",
  "js/components/library.js",
  "js/components/search.js",
  "js/components/settings.js",
  "js/data/personas.json",
  "js/data/hooks.json",
  "js/data/objections.json",
  "js/data/diagnostics.json",
  "js/data/qualification.json",
  "js/data/questions.json",
  "js/data/personaFocus.json",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-512-maskable.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if(res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => null);

      if(cached) { network; return cached; } // stale-while-revalidate

      const fresh = await network;
      if(fresh) return fresh;

      // Hors ligne et jamais mis en cache : pour une navigation, on retombe sur l'app shell.
      if(req.mode === "navigate") return cache.match("index.html");
      return new Response("", { status: 504, statusText: "Hors ligne" });
    })
  );
});
