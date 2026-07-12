import assert from "node:assert/strict";
import test from "node:test";
import { createTimerEngine } from "../js/timerEngine.js";

test("timer engine owns running state and follows the absolute deadline", () => {
  let clock = 1_000;
  let scheduledTick = null;
  const events = [];
  const engine = createTimerEngine({
    now: () => clock,
    setIntervalFn: (callback) => {
      scheduledTick = callback;
      return 7;
    },
    clearIntervalFn: () => {},
    onTick: (state) => events.push(`tick:${state.remainingSeconds}`),
    onComplete: () => events.push("complete"),
  });

  engine.setMode("focus", 3);
  assert.equal(engine.start(), true);
  assert.equal(engine.getState().endsAt, 4_000);
  clock = 2_200;
  scheduledTick();
  assert.equal(engine.getState().remainingSeconds, 2);
  clock = 4_100;
  scheduledTick();
  assert.deepEqual(events, ["tick:2", "tick:0", "complete"]);
  engine.stop();
  assert.equal(engine.isRunning(), false);
});

test("timer engine pauses and resumes without exposing interval ids", () => {
  let clock = 10_000;
  const engine = createTimerEngine({
    now: () => clock,
    setIntervalFn: () => 1,
    clearIntervalFn: () => {},
  });
  engine.setMode("rest", 10);
  engine.start();
  clock = 13_200;
  assert.equal(engine.pause().remainingSeconds, 7);
  assert.equal(engine.getState().endsAt, 0);
  assert.equal(engine.resume(20_000), true);
  assert.equal(engine.getState().remainingSeconds, 7);
});
