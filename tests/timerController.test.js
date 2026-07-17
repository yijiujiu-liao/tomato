import assert from "node:assert/strict";
import test from "node:test";
import { createTimerController } from "../js/timerController.js";

test("timer controller enforces task-first start and owns mode settings", () => {
  const state = { mode: "focus", remainingSeconds: 3000, endsAt: 0, running: false };
  const engine = {
    getState: () => ({ ...state }),
    isRunning: () => state.running,
    start: () => { state.running = true; },
    pause: () => { state.running = false; state.endsAt = 0; return { ...state }; },
    setMode: (mode, seconds) => { state.mode = mode; state.remainingSeconds = seconds; state.running = false; },
    setRemaining: (seconds) => { state.remainingSeconds = seconds; },
  };
  const data = { focusDuration: 50 };
  const status = { textContent: "" };
  let taskAvailable = false;
  let focused = false;
  let persisted = 0;
  let confirmResult = false;
  const confirmations = [];
  const controller = createTimerController({
    engine,
    modes: { focus: { minutes: 50, label: "专注" }, rest: { minutes: 5, label: "休息" } },
    getData: () => data,
    getRestMinutes: () => 5,
    ensureFocusTask: () => taskAvailable,
    statusText: status,
    newTaskInput: { focus: () => { focused = true; } },
    focusDurationInput: { value: 50 },
    restDurationSelect: { value: "short" },
    unlockAudio: () => {},
    requestNotificationPermission: () => {},
    clearActiveTimer: () => {},
    persistActiveTimer: () => { persisted += 1; },
    closeCompletion: () => {},
    clearPendingRest: () => {},
    setRestType: () => {},
    saveData: () => {},
    render: () => {},
    updateStartButton: () => {},
    runCloudSync: () => {},
    syncSettings: () => {},
    confirmAbandon: (message) => {
      confirmations.push(message);
      return confirmResult;
    },
  });

  assert.equal(controller.start(), false);
  assert.equal(focused, true);
  taskAvailable = true;
  assert.equal(controller.start(), true);
  assert.equal(state.running, true);
  assert.equal(persisted, 1);
  state.remainingSeconds = 2400;
  controller.pause();
  assert.equal(controller.abandon(), false);
  assert.match(confirmations.at(-1), /记录不会保存/);
  confirmResult = true;
  assert.equal(controller.abandon(), true);
  assert.equal(state.remainingSeconds, 3000);
  controller.switchMode("rest");
  assert.equal(state.mode, "rest");
  assert.equal(state.remainingSeconds, 300);
  assert.match(status.textContent, /休息模式/);
});
