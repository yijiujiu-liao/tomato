export function createFocusSessionController({
  engine,
  modes,
  timerController,
  navigate,
  prepareStart = () => {},
  confirmExit = (message) => window.confirm(message),
}) {
  function hasInProgressSession() {
    const state = engine.getState();
    const totalSeconds = modes[state.mode].minutes * 60;
    return state.running || state.remainingSeconds < totalSeconds;
  }

  function start() {
    prepareStart();
    const started = timerController.start();
    if (started) {
      navigate("focus-session", { pushHistory: true, force: true });
    }
    return started;
  }

  function toggle() {
    if (engine.isRunning()) {
      return timerController.pause();
    }
    return start();
  }

  function reset() {
    return timerController.reset();
  }

  function abandon() {
    const abandoned = timerController.abandon();
    if (abandoned) {
      navigate("home", { force: true });
    }
    return abandoned;
  }

  function exit() {
    return navigate("home", { pushHistory: false });
  }

  function canNavigate({ from, to }) {
    if (from !== "focus-session" || to === "focus-session" || !hasInProgressSession()) {
      return true;
    }

    const state = engine.getState();
    const message = state.mode === "focus"
      ? "本轮记录不会保存，确定退出吗？"
      : "本轮休息还没有结束，确定退出吗？";

    if (!confirmExit(message)) {
      return false;
    }

    timerController.reset();
    if (state.mode === "rest") {
      timerController.switchMode("focus");
    }
    return true;
  }

  function getInitialPage(requestedPage) {
    return engine.isRunning() ? "focus-session" : requestedPage;
  }

  return {
    start,
    toggle,
    reset,
    abandon,
    exit,
    canNavigate,
    getInitialPage,
    hasInProgressSession,
  };
}
