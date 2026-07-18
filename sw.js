const CACHE_NAME = "kaoyan-pomodoro-v74";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./css/theme.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/pages.css",
  "./css/overlays.css",
  "./css/responsive.css",
  "./css/refinements.css",
  "./css/focus-session.css",
  "./script.js",
  "./js/state.js",
  "./js/api.js",
  "./js/authController.js",
  "./js/cloudRepository.js",
  "./js/cloudStatsController.js",
  "./js/cloudSync.js",
  "./js/cloudState.js",
  "./js/timer.js",
  "./js/timerEngine.js",
  "./js/timerController.js",
  "./js/activeTimerController.js",
  "./js/effects.js",
  "./js/navigation.js",
  "./js/utils.js",
  "./js/storage.js",
  "./js/pet.js",
  "./js/petController.js",
  "./js/tasks.js",
  "./js/taskStore.js",
  "./js/taskController.js",
  "./js/todayStore.js",
  "./js/goals.js",
  "./js/goalController.js",
  "./js/focusRecords.js",
  "./js/focusSession.js",
  "./js/focusFlowController.js",
  "./js/focusSessionController.js",
  "./js/sync.js",
  "./js/studySyncController.js",
  "./js/aiReview.js",
  "./js/aiController.js",
  "./js/aiPlanController.js",
  "./js/components/aiSummary.js",
  "./js/components/auth.js",
  "./js/components/authFeature.js",
  "./js/components/appLayout.js",
  "./js/components/timerPanel.js",
  "./js/components/taskSwipe.js",
  "./js/components/studyGoals.js",
  "./js/components/currentGoal.js",
  "./js/components/longGoalOnboarding.js",
  "./js/components/feedback.js",
  "./js/components/diagnostics.js",
  "./js/components/stats.js",
  "./js/components/taskCard.js",
  "./js/components/petCompanion.js",
  "./js/pages/home.js",
  "./js/pages/tasks.js",
  "./js/pages/review.js",
  "./js/pages/pet.js",
  "./js/pages/data.js",
  "./js/pages/focusSession.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon.svg",
  "./assets/pets/penguin-v2.png",
  "./assets/pets/purple-dragon-v2.png",
  "./assets/pets/green-dino-v2.png",
  "./assets/pets/chick-v2.png"
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
        if (networkResponse.ok) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
        }

        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(async (cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (isAppShellRequest) {
              const shell = await caches.match("./index.html");
              if (shell) return shell;
            }
            return new Response("当前离线，且此资源尚未缓存。", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          });
      })
  );
});
