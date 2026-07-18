import assert from "node:assert/strict";
import test from "node:test";
import { createStudySyncController } from "../js/studySyncController.js";
import { createTaskStore } from "../js/taskStore.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("study sync controller uploads local entities in dependency-safe order", async () => {
  const storage = new MemoryStorage();
  const taskStore = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });
  const localTask = { id: "task-local", title: "数学", completed: false, studyGoalId: "goal-local" };
  taskStore.addTask("2026-07-12", localTask);
  taskStore.rememberDeleted("task-deleted");
  const data = {
    focusDuration: 50,
    dailyGoal: 8,
    theme: "light",
    nextRestType: "short",
    currentTaskId: "task-local",
    currentStudyGoalId: "goal-local",
    selectedPet: "penguin",
    petProgress: { petId: "penguin", level: 1, currentXP: 50, totalXP: 50, lastUpdated: "pet-v1" },
    records: [{
      id: "focus-local",
      taskId: "task-local",
      studyGoalId: "goal-local",
      task: "数学",
      minutes: 50,
      startedAt: "2026-07-12T09:00:00Z",
      endedAt: "2026-07-12T09:50:00Z",
      dateKey: "2026-07-12",
      streak: 1,
      xpEarned: 50,
    }],
  };
  const goals = [{ id: "goal-local", title: "数学一轮", targetMinutes: 1000, completed: false }];
  const calls = [];
  const repository = {
    deleteTask: async (id) => calls.push(`delete:${id}`),
    createStudyGoal: async (goal) => {
      calls.push(`goal:${goal.id}`);
      return { studyGoal: { ...goal, id: "goal-cloud", clientId: goal.id } };
    },
    updateSettings: async () => calls.push("settings"),
    updatePet: async (pet) => {
      calls.push("pet");
      return { pet: { ...pet, updatedAt: "pet-v2" } };
    },
    createFocusSession: async (record) => {
      calls.push(`focus:${record.clientId}`);
      assert.equal(record.taskId, "task-cloud");
      assert.equal(record.studyGoalId, "goal-cloud");
      return { focusSession: { id: "focus-cloud", clientId: record.clientId } };
    },
    createTask: async (task) => {
      calls.push(`task:${task.id}`);
      return { task: { ...task, id: "task-cloud", clientId: task.id } };
    },
  };
  const controller = createStudySyncController({
    repository,
    taskStore,
    isEnabled: () => true,
    getTodayData: () => data,
    getStudyGoals: () => goals,
    getTodayKey: () => "2026-07-12",
    createFocusRecordId: () => "focus-new",
    onUser: () => {},
    applySettings: () => {},
    applyPet: () => {},
    applyTasks: () => {},
    applyStudyGoals: () => {},
    applyFocusSessions: () => {},
    replaceStudyGoal: (previousId, goal) => {
      const index = goals.findIndex((item) => item.id === previousId);
      goals[index] = goal;
    },
    onTaskIdentityChanged: () => {},
    saveToday: () => {},
    savePlans: () => {},
    onPulled: () => {},
  });

  await controller.push();
  assert.deepEqual(calls, [
    "delete:task-deleted",
    "goal:goal-local",
    "task:task-local",
    "settings",
    "pet",
    "focus:focus-local",
  ]);
  assert.equal(data.records[0].syncedSessionId, "focus-cloud");
  assert.equal(data.records[0].taskId, "task-cloud");
  assert.equal(data.records[0].studyGoalId, "goal-cloud");
  assert.equal(localTask.syncedTaskId, "task-cloud");
  assert.equal(localTask.studyGoalId, "goal-cloud");
  assert.equal(taskStore.getDeletedIds().size, 0);
});

test("pet sync resolves version conflicts without losing the higher XP total", async () => {
  const data = {
    selectedPet: "penguin",
    petProgress: { petId: "penguin", level: 2, currentXP: 20, totalXP: 120, lastUpdated: "local-v1" },
  };
  const updates = [];
  let appliedPet = null;
  const repository = {
    updatePet: async (pet) => {
      updates.push(pet);
      if (updates.length === 1) {
        const error = new Error("conflict");
        error.code = "PET_VERSION_CONFLICT";
        throw error;
      }
      return { pet: { ...pet, updatedAt: "cloud-v3" } };
    },
    getPet: async () => ({
      pet: { petId: "penguin", level: 1, currentXP: 80, totalXP: 80, updatedAt: "cloud-v2" },
    }),
  };
  const controller = createStudySyncController({
    repository,
    taskStore: { getDeletedIds: () => new Set(), getPlans: () => ({}) },
    isEnabled: () => true,
    getTodayData: () => data,
    getStudyGoals: () => [],
    getTodayKey: () => "2026-07-13",
    createFocusRecordId: () => "focus",
    onUser: () => {}, applySettings: () => {}, applyPet: (pet) => { appliedPet = pet; },
    applyTasks: () => {}, applyStudyGoals: () => {}, applyFocusSessions: () => {},
    replaceStudyGoal: () => {}, onTaskIdentityChanged: () => {}, saveToday: () => {},
    savePlans: () => {}, onPulled: () => {},
  });

  const result = await controller.syncPet();
  assert.equal(updates.length, 2);
  assert.equal(updates[1].totalXP, 120);
  assert.equal(updates[1].updatedAt, "cloud-v2");
  assert.equal(result.totalXP, 120);
  assert.equal(appliedPet.updatedAt, "cloud-v3");
});
