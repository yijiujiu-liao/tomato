import assert from "node:assert/strict";
import test from "node:test";
import { createTodayStore } from "../js/todayStore.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("today store rolls daily counters while preserving settings and cumulative pet growth", () => {
  const storage = new MemoryStorage();
  storage.setItem("today", JSON.stringify({
    date: "2026-07-11",
    completedCount: 4,
    focusMinutes: 200,
    currentTaskId: "old-task",
    dailyGoal: 10,
    focusDuration: 45,
    theme: "dark",
    petChoiceCompleted: true,
    longGoalOnboardingCompleted: true,
    selectedPet: "penguin",
    petProgress: { petId: "penguin", level: 2, currentXP: 20, totalXP: 120, nextLevelXP: 140 },
    records: [{ task: "数学", minutes: 50 }],
  }));
  const store = createTodayStore({ storage, key: "today", getDateKey: () => "2026-07-12" });
  const data = store.load();

  assert.equal(data.date, "2026-07-12");
  assert.equal(data.completedCount, 0);
  assert.equal(data.focusMinutes, 0);
  assert.equal(data.currentTaskId, "");
  assert.equal(data.dailyGoal, 10);
  assert.equal(data.focusDuration, 45);
  assert.equal(data.theme, "dark");
  assert.equal(data.petChoiceCompleted, true);
  assert.equal(data.longGoalOnboardingCompleted, true);
  assert.equal(data.petProgress.totalXP, 120);
  assert.deepEqual(data.records, []);
});

test("today store repairs invalid JSON and persists the existing storage key", () => {
  const storage = new MemoryStorage();
  storage.setItem("today", "not-json");
  const store = createTodayStore({ storage, key: "today", getDateKey: () => "2026-07-12" });
  const data = store.load();
  assert.equal(data.date, "2026-07-12");
  store.save(data);
  assert.equal(JSON.parse(storage.getItem("today")).date, "2026-07-12");
});
