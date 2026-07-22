import { performCloudSync } from "../cloudSync.js";

export function createAuthSessionFlow({
  getController,
  view,
  getCloudStats,
  getAiReview,
  getAiFlow,
  getOnboarding,
  getData,
  switchPage,
  quickTaskInput,
  pull,
  push,
  window,
}) {
  function setMode(mode) {
    getController().setMode(mode);
  }

  function enterLocal() {
    getController().enterLocal();
    switchPage("home");
    getOnboarding()?.ensureFirstRun();
    const data = getData();
    if (data.petChoiceCompleted && data.longGoalOnboardingCompleted) {
      window.setTimeout(() => quickTaskInput?.focus(), 120);
    }
  }

  function refreshUI(state = getController().getState()) {
    view.render(state);
    if (state.session?.user) {
      updateLastSyncText();
      setSyncStatus("已开启云端同步");
    }
    getCloudStats()?.render();
  }

  function toggleMode() {
    const { mode } = getController().getState();
    setMode(mode === "login" ? "register" : "login");
  }

  async function authenticate(credentials) {
    const authenticated = await getController().authenticate(credentials);
    if (authenticated) getOnboarding()?.ensureFirstRun();
    return authenticated;
  }

  function setFeedback(message, isError = false) {
    setSyncStatus(message, isError);
    view.setFeedback(message, isError);
  }

  function logout() {
    return getController().logout();
  }

  function resetCloudState() {
    getCloudStats()?.reset();
    getAiReview()?.reset();
    setSyncStatus("已回到本地模式");
  }

  async function bootstrap() {
    const restored = await getController().bootstrap();
    getOnboarding()?.ensureFirstRun();
    return restored;
  }

  function isCloudEnabled() {
    return getController().isCloudEnabled();
  }

  function setSyncStatus(message, isError = false) {
    view.setSyncStatus(message, isError);
  }

  async function sync(message = "正在同步...", options = {}) {
    return performCloudSync({
      enabled: isCloudEnabled(),
      message,
      cloudFirst: options.cloudFirst,
      setBusy: (busy) => view.setManualSyncBusy(busy),
      setStatus: setSyncStatus,
      pull,
      push,
      refreshStats: () => getCloudStats()?.load(
        getCloudStats().getRange(),
        { silent: true },
      ),
      loadAi: () => getAiFlow()?.load(),
      onSynced: markSynced,
      onRefresh: () => {
        refreshUI();
        getAiFlow()?.render();
      },
    });
  }

  function markSynced() {
    getController().markSynced();
    updateLastSyncText();
  }

  function updateLastSyncText() {
    const lastSyncedAt = getController().getSession()?.lastSyncedAt;
    view.setLastSyncText(lastSyncedAt
      ? `上次同步 ${formatSyncTime(lastSyncedAt)}`
      : "尚未同步");
  }

  return {
    authenticate,
    bootstrap,
    enterLocal,
    isCloudEnabled,
    logout,
    refreshUI,
    resetCloudState,
    setFeedback,
    setMode,
    setSyncStatus,
    sync,
    toggleMode,
  };
}

export function formatSyncTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
