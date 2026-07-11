import assert from "node:assert/strict";
import test from "node:test";
import {
  createTimerDeadline,
  getRemainingSeconds,
  normalizeActiveTimer
} from "../js/timer.js";

test("timer uses an absolute deadline so background delays do not slow it down", () => {
  const startedAt = Date.parse("2026-07-11T08:00:00.000Z");
  const deadline = createTimerDeadline(50 * 60, startedAt);

  assert.equal(getRemainingSeconds(deadline, startedAt + 20 * 60 * 1000), 30 * 60);
  assert.equal(getRemainingSeconds(deadline, deadline + 5000), 0);
});

test("stored timer state accepts valid modes and rejects malformed values", () => {
  const timer = normalizeActiveTimer({
    date: "2026-07-11",
    mode: "focus",
    endsAt: "2026-07-11T08:50:00.000Z"
  });

  assert.equal(timer.mode, "focus");
  assert.equal(normalizeActiveTimer({ mode: "unknown", endsAt: timer.endsAt }), null);
  assert.equal(normalizeActiveTimer({ mode: "focus", endsAt: "invalid" }), null);
});
