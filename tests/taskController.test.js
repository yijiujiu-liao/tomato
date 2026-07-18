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
    currentStudyGoalId: "",
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

  assert.equal(controller.add("数学真题", "goal-math"), true);
  const taskId = data.currentTaskId;
  assert.equal(store.getTasks("2026-07-12")[0].title, "数学真题");
  assert.equal(store.getTasks("2026-07-12")[0].studyGoalId, "goal-math");
  assert.equal(data.currentStudyGoalId, "goal-math");
  const completion = controller.complete(taskId);
  assert.equal(completion.task.completed, true);
  assert.ok(data.petProgress.totalXP > 0);
  assert.equal(data.currentTaskId, "");
  assert.ok(events.includes("page:review"));

  const earnedXP = data.petProgress.totalXP;
  assert.equal(controller.restore(taskId), true);
  assert.equal(data.petProgress.totalXP, earnedXP);
  assert.equal(data.currentTaskId, taskId);
  assert.equal(controller.complete(taskId).reward.totalXP, 0);
  assert.equal(data.petProgress.totalXP, earnedXP);
  assert.ok(events.includes("任务再次完成，本次不重复获得 XP。"));
  assert.equal(controller.restore(taskId), true);
  const delayed = controller.delay(taskId);
  assert.equal(delayed.delayedTask.carriedFromId, taskId);
  assert.equal(store.getTasks("2026-07-12").length, 0);
  assert.equal(store.getTasks("2026-07-13").length, 1);
  assert.equal(delayed.delayedTask.studyGoalId, "goal-math");
});

test("completing an AI-carried task explains the feedback loop", () => {
  const store = createTaskStore({ storage: new MemoryStorage(), plansKey: "plans", deletedKey: "deleted" });
  const data = {
    currentTaskId: "ai-task",
    currentTask: "英语：精读一篇阅读",
    selectedPet: "penguin",
    petProgress: createPetProgress("penguin"),
    todayPetXP: 0,
    streak: 0,
  };
  store.addTask("2026-07-13", {
    id: "ai-task",
    title: data.currentTask,
    completed: false,
    source: "ai",
  });
  const messages = [];
  const controller = createTaskController({
    taskStore: store,
    petController: createPetController({ getData: () => data, save: () => {} }),
    syncController: {},
    getData: () => data,
    getTodayKey: () => "2026-07-13",
    getYesterdayKey: () => "2026-07-12",
    getTomorrowKey: () => "2026-07-14",
    createTaskId: () => "unused",
    savePlans: () => {},
    saveData: () => {},
    renderTasks: () => {},
    renderCurrentOptions: () => {},
    renderHome: () => {},
    renderReview: () => {},
    renderPet: () => {},
    updateStartButton: () => {},
    runCloudSync: () => {},
    showToast: (message) => messages.push(message),
    hideToast: () => {},
    switchPage: () => {},
    vibrate: () => {},
  });

  controller.complete("ai-task");
  assert.match(messages[0], /今晚复盘会据此调整计划/);
});

test("editing and deleting the selected task refresh home and start state", () => {
  const store = createTaskStore({ storage: new MemoryStorage(), plansKey: "plans", deletedKey: "deleted" });
  const data = {
    currentTaskId: "selected-task",
    currentTask: "英语阅读",
  };
  store.addTask("2026-07-17", {
    id: "selected-task",
    title: "英语阅读",
    completed: false,
  });
  const events = [];
  const controller = createTaskController({
    taskStore: store,
    petController: {},
    syncController: {},
    getData: () => data,
    getTodayKey: () => "2026-07-17",
    getYesterdayKey: () => "2026-07-16",
    getTomorrowKey: () => "2026-07-18",
    createTaskId: () => "unused",
    savePlans: () => {},
    saveData: () => {},
    renderTasks: () => events.push("tasks"),
    renderCurrentOptions: () => events.push("options"),
    renderHome: () => events.push("home"),
    renderReview: () => events.push("review"),
    renderPet: () => {},
    updateStartButton: () => events.push("start"),
    runCloudSync: () => {},
    showToast: () => {},
    hideToast: () => {},
    switchPage: () => {},
    vibrate: () => {},
    confirmDelete: () => true,
  });

  assert.equal(controller.edit("selected-task", "英语精读"), true);
  assert.equal(data.currentTask, "英语精读");
  assert.ok(events.includes("home"));

  events.length = 0;
  assert.equal(controller.remove("selected-task"), true);
  assert.equal(data.currentTaskId, "");
  assert.equal(data.currentTask, "");
  assert.equal(store.getTasks("2026-07-17").length, 0);
  assert.ok(events.includes("home"));
  assert.ok(events.includes("start"));
});
