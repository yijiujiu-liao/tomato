import assert from "node:assert/strict";
import test from "node:test";
import {
  getPetProgressFromTotalXP,
  normalizeDateKey,
  normalizeOptionalDateKey,
  normalizeTimestamp,
} from "../server/validation.js";

test("server date validation rejects impossible calendar dates", () => {
  const fallback = new Date("2026-07-17T00:00:00.000Z");
  assert.equal(normalizeDateKey("2026-02-28", fallback), "2026-02-28");
  assert.equal(normalizeDateKey("2026-02-30", fallback), "2026-07-17");
  assert.equal(normalizeOptionalDateKey("2026-13-01"), null);
});

test("server timestamp validation never throws on malformed values", () => {
  assert.equal(normalizeTimestamp("not-a-date"), null);
  assert.equal(
    normalizeTimestamp("2026-07-17T10:00:00+08:00"),
    "2026-07-17T02:00:00.000Z",
  );
});

test("server pet progress derives level and current XP from cumulative XP", () => {
  assert.deepEqual(getPetProgressFromTotalXP(290), {
    level: 3,
    currentXP: 40,
    nextLevelXP: 200,
    totalXP: 290,
  });
});
