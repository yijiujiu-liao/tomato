import {
  createActiveTimerSnapshot,
  restoreActiveTimerSnapshot,
} from "./timer.js";

export function createActiveTimerController({
  engine,
  getData,
  getTodayKey,
  getDateKey,
  save,
  setStatus = () => {},
  onExpired = () => {},
}) {
  function persist() {
    const data = getData();
    const timerState = engine.getState();
    data.activeTimer = createActiveTimerSnapshot({
      date: data.date,
      mode: timerState.mode,
      endsAt: timerState.endsAt,
    });
    save(false);
  }

  function clear() {
    const data = getData();
    if (!data.activeTimer) return;
    data.activeTimer = null;
    save(false);
  }

  function restore() {
    const data = getData();
    const restored = restoreActiveTimerSnapshot(data.activeTimer, {
      todayKey: getTodayKey(),
      getDateKey,
    });

    if (restored.status === "invalid") {
      data.activeTimer = null;
      return restored;
    }

    if (restored.status === "outdated") {
      data.activeTimer = null;
      save(false);
      engine.stop();
      return restored;
    }

    engine.setMode(restored.mode, restored.remainingSeconds);

    if (restored.status === "running") {
      engine.resume(restored.endsAt);
      setStatus(restored.mode === "focus"
        ? "已恢复正在进行的专注，倒计时按真实时间继续。"
        : "已恢复休息倒计时。");
      return restored;
    }

    data.activeTimer = null;
    save(false);
    queueMicrotask(onExpired);
    return restored;
  }

  return { persist, clear, restore };
}
