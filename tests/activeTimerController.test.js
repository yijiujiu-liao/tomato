import assert from "node:assert/strict";
import test from "node:test";
import { createActiveTimerController } from "../js/activeTimerController.js";

test("active timer controller persists and clears the current deadline", () => {
  const data = { date: "2026-07-17", activeTimer: null };
  const saves = [];
  const controller = createActiveTimerController({
    engine: {
      getState: () => ({
        mode: "focus",
        endsAt: "2026-07-17T10:50:00.000Z",
      }),
    },
    getData: () => data,
    getTodayKey: () => "2026-07-17",
    getDateKey: () => "2026-07-17",
    save: (sync) => saves.push(sync),
  });

  controller.persist();
  assert.equal(data.activeTimer.mode, "focus");
  assert.equal(data.activeTimer.endsAt, "2026-07-17T10:50:00.000Z");
  controller.clear();
  assert.equal(data.activeTimer, null);
  assert.deepEqual(saves, [false, false]);
});

test("active timer controller rejects a snapshot from another day", () => {
  const data = {
    activeTimer: {
      date: "2026-07-16",
      mode: "focus",
      endsAt: "2026-07-16T10:50:00.000Z",
    },
  };
  let stopped = 0;
  const controller = createActiveTimerController({
    engine: {
      stop: () => { stopped += 1; },
      getState: () => ({}),
    },
    getData: () => data,
    getTodayKey: () => "2026-07-17",
    getDateKey: () => "2026-07-16",
    save: () => {},
  });

  assert.equal(controller.restore().status, "outdated");
  assert.equal(data.activeTimer, null);
  assert.equal(stopped, 1);
});
