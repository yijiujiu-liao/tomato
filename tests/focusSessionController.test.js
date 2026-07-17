import assert from "node:assert/strict";
import test from "node:test";
import { createFocusSessionController } from "../js/focusSessionController.js";

test("focus session controller owns immersive navigation and guarded exits", () => {
  const state = { mode: "focus", remainingSeconds: 3000, running: false };
  const calls = [];
  let confirmation = false;
  const engine = {
    getState: () => ({ ...state }),
    isRunning: () => state.running,
  };
  const timerController = {
    start: () => { state.running = true; return true; },
    pause: () => { state.running = false; return true; },
    reset: () => { state.running = false; state.remainingSeconds = 3000; calls.push("reset"); },
    abandon: () => true,
    switchMode: (mode) => { state.mode = mode; calls.push(`mode:${mode}`); },
  };
  const controller = createFocusSessionController({
    engine,
    modes: { focus: { minutes: 50 }, rest: { minutes: 5 } },
    timerController,
    navigate: (page, options) => calls.push([page, options]),
    confirmExit: () => confirmation,
  });

  assert.equal(controller.start(), true);
  assert.deepEqual(calls.at(-1), ["focus-session", { pushHistory: true, force: true }]);
  assert.equal(controller.getInitialPage("home"), "focus-session");

  state.running = false;
  state.remainingSeconds = 2400;
  assert.equal(controller.canNavigate({ from: "focus-session", to: "home" }), false);
  assert.equal(calls.includes("reset"), false);

  confirmation = true;
  assert.equal(controller.canNavigate({ from: "focus-session", to: "home" }), true);
  assert.equal(calls.includes("reset"), true);
  assert.equal(controller.hasInProgressSession(), false);
});

test("focus session commits pending round settings before starting", () => {
  const calls = [];
  const controller = createFocusSessionController({
    engine: {
      getState: () => ({ mode: "focus", running: false, remainingSeconds: 60 }),
      isRunning: () => false,
    },
    modes: { focus: { minutes: 1 }, rest: { minutes: 5 } },
    timerController: {
      start: () => {
        calls.push("start");
        return true;
      },
    },
    prepareStart: () => calls.push("prepare"),
    navigate: () => calls.push("navigate"),
  });

  assert.equal(controller.start(), true);
  assert.deepEqual(calls, ["prepare", "start", "navigate"]);
});
