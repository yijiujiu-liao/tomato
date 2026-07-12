export function createTimerEngine({
  now = () => Date.now(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  onTick,
  onComplete,
} = {}) {
  const state = {
    mode: "focus",
    remainingSeconds: 0,
    endsAt: 0,
    intervalId: null,
  };

  function snapshot() {
    return {
      mode: state.mode,
      remainingSeconds: state.remainingSeconds,
      endsAt: state.endsAt,
      running: state.intervalId !== null,
    };
  }

  function stopInterval() {
    if (state.intervalId !== null) clearIntervalFn(state.intervalId);
    state.intervalId = null;
  }

  function tick() {
    if (state.intervalId === null || !state.endsAt) return;
    const nextSeconds = Math.max(0, Math.ceil((state.endsAt - now()) / 1000));
    if (nextSeconds === state.remainingSeconds) return;
    state.remainingSeconds = nextSeconds;
    onTick?.(snapshot());
    if (nextSeconds <= 0) onComplete?.(snapshot());
  }

  function start() {
    if (state.intervalId !== null || state.remainingSeconds <= 0) return false;
    state.endsAt = now() + (state.remainingSeconds * 1000);
    state.intervalId = setIntervalFn(tick, 500);
    return true;
  }

  function resume(endsAt) {
    stopInterval();
    state.endsAt = Number(endsAt) || 0;
    state.remainingSeconds = Math.max(0, Math.ceil((state.endsAt - now()) / 1000));
    if (state.remainingSeconds <= 0) return false;
    state.intervalId = setIntervalFn(tick, 500);
    return true;
  }

  function pause() {
    if (state.intervalId !== null && state.endsAt) {
      state.remainingSeconds = Math.max(0, Math.ceil((state.endsAt - now()) / 1000));
    }
    stopInterval();
    state.endsAt = 0;
    return snapshot();
  }

  function stop() {
    stopInterval();
    state.endsAt = 0;
    return snapshot();
  }

  function setMode(mode, seconds) {
    stop();
    state.mode = mode === "rest" ? "rest" : "focus";
    state.remainingSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return snapshot();
  }

  function setRemaining(seconds) {
    state.remainingSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return snapshot();
  }

  return {
    getState: snapshot,
    isRunning: () => state.intervalId !== null,
    start,
    resume,
    pause,
    stop,
    setMode,
    setRemaining,
    tick,
  };
}
