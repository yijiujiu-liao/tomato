const CACHE_NAME = "kaoyan-pomodoro-v38";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./js/state.js",
  "./js/api.js",
  "./js/timer.js",
  "./js/components/aiSummary.js",
  "./js/components/diagnostics.js",
  "./js/components/stats.js",
  "./js/components/taskCard.js",
  "./js/pages/home.js",
  "./js/pages/tasks.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.svg",
  "./assets/pets/penguin.webp",
  "./assets/pets/purple-dragon.webp",
  "./assets/pets/green-dino.webp",
  "./assets/pets/chick.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET") {
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  const isAppShellRequest = event.request.mode === "navigate"
    || ["/", "/index.html", "/style.css", "/script.js", "/sw.js"].includes(requestUrl.pathname);

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseCopy = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseCopy);
        });

        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => cachedResponse || (isAppShellRequest ? caches.match("./index.html") : null));
      })
  );
});
