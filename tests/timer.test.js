import assert from "node:assert/strict";
import test from "node:test";
import {
  createActiveTimerSnapshot,
  createTimerDeadline,
  getRemainingSeconds,
  normalizeActiveTimer,
  restoreActiveTimerSnapshot
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

test("active timer snapshots restore running, expired, and outdated states", () => {
  const now = Date.parse("2026-07-11T08:00:00.000Z");
  const snapshot = createActiveTimerSnapshot({
    date: "2026-07-11",
    mode: "focus",
    endsAt: now + 50 * 60 * 1000
  });
  const getDateKey = () => "2026-07-11";

  assert.equal(restoreActiveTimerSnapshot(snapshot, { todayKey: "2026-07-11", now, getDateKey }).status, "running");
  assert.equal(restoreActiveTimerSnapshot(snapshot, {
    todayKey: "2026-07-11",
    now: now + 51 * 60 * 1000,
    getDateKey
  }).status, "expired");
  assert.equal(restoreActiveTimerSnapshot(snapshot, {
    todayKey: "2026-07-12",
    now,
    getDateKey
  }).status, "outdated");
});
