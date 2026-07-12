import assert from "node:assert/strict";
import test from "node:test";
import { createTaskController } from "../js/taskController.js";
import { createTaskStore } from "../js/taskStore.js";
import { createPetController } from "../js/petController.js";
import { createPetProgress } from "../js/pet.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("task controller keeps task, selection, pet reward, restore, and delay in one transaction", () => {
  const store = createTaskStore({ storage: new MemoryStorage(), plansKey: "plans", deletedKey: "deleted" });
  const data = {
    currentTaskId: "",
    currentTask: "",
    selectedPet: "penguin",
    petProgress: createPetProgress("penguin"),
    todayPetXP: 0,
    streak: 0,
  };
  const pet = createPetController({ getData: () => data, save: () => {} });
  const events = [];
  let id = 0;
  const controller = createTaskController({
    taskStore: store,
    petController: pet,
    syncController: {},
    getData: () => data,
    getTodayKey: () => "2026-07-12",
    getYesterdayKey: () => "2026-07-11",
    getTomorrowKey: () => "2026-07-13",
    createTaskId: () => `task-${++id}`,
    savePlans: () => events.push("save-plans"),
    saveData: () => events.push("save-data"),
    renderTasks: () => {},
    renderCurrentOptions: () => {},
    renderHome: () => {},
    renderReview: () => {},
    renderPet: () => {},
    updateStartButton: () => {},
    runCloudSync: () => {},
    showToast: (message) => events.push(message),
    hideToast: () => events.push("hide-toast"),
    switchPage: (page) => events.push(`page:${page}`),
    vibrate: () => events.push("vibrate"),
    confirmDelete: () => true,
  });

  assert.equal(controller.add("数学真题"), true);
  const taskId = data.currentTaskId;
  assert.equal(store.getTasks("2026-07-12")[0].title, "数学真题");
  const completion = controller.complete(taskId);
  assert.equal(completion.task.completed, true);
  assert.ok(data.petProgress.totalXP > 0);
  assert.equal(data.currentTaskId, "");
  assert.ok(events.includes("page:review"));

  assert.equal(controller.restore(taskId), true);
  assert.equal(data.petProgress.totalXP, 0);
  assert.equal(data.currentTaskId, taskId);
  const delayed = controller.delay(taskId);
  assert.equal(delayed.delayedTask.carriedFromId, taskId);
  assert.equal(store.getTasks("2026-07-12").length, 0);
  assert.equal(store.getTasks("2026-07-13").length, 1);
});
