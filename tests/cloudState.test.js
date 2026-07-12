import assert from "node:assert/strict";
import test from "node:test";
import { createCloudStateApplier } from "../js/cloudState.js";
import { createTaskStore } from "../js/taskStore.js";
import { createPetProgress } from "../js/pet.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("cloud state applier normalizes remote settings, pet, tasks, and focus counters", () => {
  const taskStore = createTaskStore({ storage: new MemoryStorage(), plansKey: "plans", deletedKey: "deleted" });
  const data = {
    records: [],
    todayPetXP: 999,
    selectedPet: "penguin",
    petProgress: createPetProgress("penguin"),
  };
  let goals = [];
  const modes = { focus: { minutes: 50 }, rest: { minutes: 5 } };
  const engine = { getState: () => ({ mode: "focus" }), isRunning: () => false, setRemaining: (seconds) => { engine.remaining = seconds; } };
  const fields = { focus: {}, rest: {}, goal: {} };
  const applier = createCloudStateApplier({
    getData: () => data,
    taskStore,
    getGoals: () => goals,
    setGoals: (next) => { goals = next; },
    getTodayKey: () => "2026-07-12",
    modes,
    timerEngine: engine,
    focusDurationInput: fields.focus,
    restDurationSelect: fields.rest,
    goalInput: fields.goal,
    getRestMinutes: () => 5,
    applyTheme: () => {},
    saveData: () => {},
    savePlans: () => {},
    saveGoals: () => {},
    renderGoals: () => {},
  });

  applier.settings({ focusDuration: 45, dailyGoal: 10, theme: "dark", nextRestType: "long" });
  assert.equal(data.focusDuration, 45);
  assert.equal(engine.remaining, 2700);
  applier.pet({ petId: "penguin", level: 1, currentXP: 20, totalXP: 20 });
  assert.equal(data.todayPetXP, 20);
  applier.tasks([{ id: "cloud-task", clientId: "local-task", title: "数学", dateKey: "2026-07-12" }]);
  assert.equal(taskStore.getTasks("2026-07-12").length, 1);
  applier.focusSessions([{ id: "focus-cloud", clientId: "focus-local", mode: "focus", taskTitle: "数学", minutes: 45, streak: 1, dateKey: "2026-07-12", endedAt: "2026-07-12T10:00:00Z" }]);
  assert.equal(data.focusMinutes, 45);
});
