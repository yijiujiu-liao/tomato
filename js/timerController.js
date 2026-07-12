import { normalizeFocusDuration } from "./utils.js";

export function createTimerController({
  engine,
  modes,
  getData,
  getRestMinutes,
  ensureFocusTask,
  statusText,
  newTaskInput,
  focusDurationInput,
  restDurationSelect,
  unlockAudio,
  requestNotificationPermission,
  clearActiveTimer,
  persistActiveTimer,
  closeCompletion,
  clearPendingRest,
  setRestType,
  saveData,
  render,
  updateStartButton,
  runCloudSync,
  syncSettings,
  confirmAbandon = (message) => window.confirm(message),
}) {
  function pauseSilently() {
    engine.pause();
    clearActiveTimer();
  }

  function start() {
    const state = engine.getState();
    if (state.running) return false;
    if (state.mode === "focus" && !ensureFocusTask()) {
      statusText.textContent = "先写下今天要完成的一件事。";
      newTaskInput.focus();
      return false;
    }
    unlockAudio();
    requestNotificationPermission();
    statusText.textContent = state.mode === "focus"
      ? "专注进行中，你的宠物正在积累成长能量。"
      : "休息进行中，恢复也是学习的一部分。";
    engine.start();
    persistActiveTimer();
    updateStartButton();
    return true;
  }

  function pause() {
    if (!engine.isRunning()) return false;
    const state = engine.pause();
    clearActiveTimer();
    updateStartButton();
    statusText.textContent = state.mode === "focus"
      ? "已暂停，本轮还没完成，所以暂时不会获得 XP。继续完成就可以结算。"
      : "休息已暂停，准备好后继续。";
    return true;
  }

  function reset() {
    const state = engine.getState();
    const interrupted = state.running && state.mode === "focus";
    pauseSilently();
    if (state.mode === "rest") modes.rest.minutes = getRestMinutes();
    engine.setMode(state.mode, modes[state.mode].minutes * 60);
    statusText.textContent = interrupted
      ? "本轮专注已重置，不获得 XP，但已有等级和经验不会丢。"
      : `已重置为${modes[state.mode].label}模式。`;
    render();
  }

  function abandon() {
    const state = engine.getState();
    if (state.mode === "focus" && state.running && !confirmAbandon("确定放弃本轮专注吗？本轮不会获得 XP，也不会写入学习记录。")) {
      return false;
    }
    reset();
    return true;
  }

  function switchMode(mode) {
    if (!modes[mode]) return false;
    closeCompletion();
    clearPendingRest();
    const state = engine.getState();
    const interrupted = state.running && state.mode === "focus" && mode !== "focus";
    pauseSilently();
    if (mode === "rest") modes.rest.minutes = getRestMinutes();
    engine.setMode(mode, modes[mode].minutes * 60);
    statusText.textContent = interrupted
      ? `已切换到${modes[mode].label}模式，本轮专注未完成所以不获得 XP。`
      : `已切换到${modes[mode].label}模式。`;
    render();
    return true;
  }

  function updateFocusDuration() {
    const duration = normalizeFocusDuration(focusDurationInput.value);
    const state = engine.getState();
    const interrupted = state.running && state.mode === "focus";
    if (interrupted) pauseSilently();
    const data = getData();
    data.focusDuration = duration;
    modes.focus.minutes = duration;
    focusDurationInput.value = duration;
    if (state.mode === "focus") {
      engine.setRemaining(duration * 60);
      statusText.textContent = interrupted
        ? `专注时长已改为 ${duration} 分钟，本轮未完成所以不获得 XP。`
        : `专注时长已改为 ${duration} 分钟。`;
    }
    saveData();
    render();
  }

  function updateRestDuration() {
    setRestType(restDurationSelect.value);
    saveData();
    const state = engine.getState();
    if (state.mode === "rest" && !state.running) engine.setRemaining(modes.rest.minutes * 60);
    render();
    runCloudSync(syncSettings);
  }

  return { start, pause, reset, abandon, switchMode, updateFocusDuration, updateRestDuration, pauseSilently };
}
