import assert from "node:assert/strict";
import test from "node:test";
import { countCurrentStreakDays } from "../server/stats.js";

test("study-day streak stays visible before today's first focus", () => {
  assert.equal(countCurrentStreakDays([
    { focusMinutes: 50 },
    { focusMinutes: 30 },
    { focusMinutes: 0 },
  ]), 2);
  assert.equal(countCurrentStreakDays([
    { focusMinutes: 50 },
    { focusMinutes: 30 },
    { focusMinutes: 50 },
  ]), 3);
  assert.equal(countCurrentStreakDays([
    { focusMinutes: 50 },
    { focusMinutes: 0 },
    { focusMinutes: 0 },
  ]), 0);
});
