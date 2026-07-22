export function configureRuntime({
  modes,
  data,
  getRestMinutes,
  timerEngine,
  activeTimerController,
  focusDurationInput,
  restDurationSelect,
  goalInput,
  normalizeRestType,
  applyTheme,
}) {
  modes.focus.minutes = data.focusDuration;
  modes.rest.minutes = getRestMinutes();
  timerEngine.setMode("focus", modes.focus.minutes * 60);
  activeTimerController.restore();
  focusDurationInput.value = data.focusDuration;
  restDurationSelect.value = normalizeRestType(data.nextRestType);
  goalInput.value = data.dailyGoal;
  applyTheme(data.theme);
}

export function startApplication({
  setupLayout,
  render,
  switchPage,
  initialPage,
  setupViews,
  placeUtilities,
  refreshAuth,
  bootstrapSession,
  startCompanion,
}) {
  setupLayout();
  render();
  switchPage(initialPage, { fromHistory: true, force: true });
  setupViews.forEach((setup) => setup());
  placeUtilities();
  refreshAuth();
  bootstrapSession();
  startCompanion();
}

export function registerServiceWorker(navigator, window, script = "sw.js") {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(script);
  });
}
