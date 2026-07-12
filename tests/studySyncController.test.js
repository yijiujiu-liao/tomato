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
  const localTask = { id: "task-local", title: "数学", completed: false };
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
    petProgress: { petId: "penguin", level: 1, currentXP: 50, totalXP: 50 },
    records: [{
      id: "focus-local",
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
    updatePet: async () => calls.push("pet"),
    createFocusSession: async (record) => {
      calls.push(`focus:${record.clientId}`);
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
    replaceStudyGoal: () => {},
    onTaskIdentityChanged: () => {},
    saveToday: () => {},
    savePlans: () => {},
    onPulled: () => {},
  });

  await controller.push();
  assert.deepEqual(calls, [
    "delete:task-deleted",
    "goal:goal-local",
    "settings",
    "pet",
    "focus:focus-local",
    "task:task-local",
  ]);
  assert.equal(data.records[0].syncedSessionId, "focus-cloud");
  assert.equal(localTask.syncedTaskId, "task-cloud");
  assert.equal(taskStore.getDeletedIds().size, 0);
});
