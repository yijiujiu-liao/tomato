import assert from "node:assert/strict";
import test from "node:test";
import { createStudySyncController } from "../js/studySyncController.js";
import { createSyncOutbox } from "../js/syncOutbox.js";
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
    petChoiceCompleted: true,
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
      assert.equal(pet.choiceCompleted, true);
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

test("offline failures keep task, goal, settings, pet, and focus writes in the persistent outbox", async () => {
  const storage = new MemoryStorage();
  const taskStore = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });
  const task = { id: "task-local", title: "数学错题", completed: false, studyGoalId: "goal-local" };
  taskStore.addTask("2026-07-22", task);
  const goals = [{ id: "goal-local", title: "数学二轮", completed: false }];
  const data = {
    focusDuration: 50, dailyGoal: 8, theme: "light", nextRestType: "short",
    currentTaskId: task.id, currentStudyGoalId: goals[0].id,
    selectedPet: "penguin", petChoiceCompleted: true,
    petProgress: { petId: "penguin", level: 1, currentXP: 50, totalXP: 50, lastUpdated: "pet-v1" },
    records: [{ id: "focus-local", task: "数学错题", minutes: 50, dateKey: "2026-07-22" }],
  };
  const offline = async () => { throw new Error("offline"); };
  const outbox = createSyncOutbox({ storage, key: "outbox", createId: (() => { let id = 0; return () => `entry-${++id}`; })() });
  const controller = createStudySyncController({
    repository: {
      createTask: offline, createStudyGoal: offline, updateSettings: offline,
      updatePet: offline, createFocusSession: offline,
    },
    outbox, taskStore, isEnabled: () => true, getTodayData: () => data,
    getStudyGoals: () => goals, getTodayKey: () => "2026-07-22",
    createFocusRecordId: () => "focus-new", onUser: () => {}, applySettings: () => {},
    applyPet: () => {}, applyTasks: () => {}, applyStudyGoals: () => {},
    applyFocusSessions: () => {}, replaceStudyGoal: () => {}, onTaskIdentityChanged: () => {},
    saveToday: () => {}, savePlans: () => {}, onPulled: () => {},
  });

  await assert.rejects(controller.createTask(task, "2026-07-22"), /offline/);
  await assert.rejects(controller.createStudyGoal(goals[0]), /offline/);
  await assert.rejects(controller.syncSettings(), /offline/);
  await assert.rejects(controller.syncPet(), /offline/);
  await assert.rejects(controller.uploadFocusRecords(), /offline/);

  assert.deepEqual(new Set(outbox.getEntries().map((entry) => entry.type)), new Set([
    "task.upsert", "goal.upsert", "settings.upsert", "pet.upsert", "focus.create",
  ]));
  assert.equal(JSON.parse(storage.getItem("outbox")).length, 5);
});

test("a new controller replays an outbox mutation created before refresh", async () => {
  const storage = new MemoryStorage();
  const taskStore = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });
  const task = {
    id: "task-cloud", syncedTaskId: "task-cloud", clientId: "task-local",
    title: "离线修改后的标题", completed: false, studyGoalId: "", serverUpdatedAt: "server-v1",
  };
  taskStore.addTask("2026-07-22", task);
  const data = { records: [], petProgress: {} };
  const firstOutbox = createSyncOutbox({ storage, key: "outbox", createId: () => "entry-1" });
  const base = {
    taskStore, isEnabled: () => true, getTodayData: () => data, getStudyGoals: () => [],
    getTodayKey: () => "2026-07-22", createFocusRecordId: () => "focus",
    onUser: () => {}, applySettings: () => {}, applyPet: () => {}, applyTasks: () => {},
    applyStudyGoals: () => {}, applyFocusSessions: () => {}, replaceStudyGoal: () => {},
    onTaskIdentityChanged: () => {}, saveToday: () => {}, savePlans: () => {}, onPulled: () => {},
  };
  const offlineController = createStudySyncController({
    ...base,
    outbox: firstOutbox,
    repository: { updateTask: async () => { throw new Error("offline"); } },
  });
  await assert.rejects(offlineController.patchTask(task, { title: task.title }), /offline/);
  assert.equal(firstOutbox.getEntries().length, 1);

  let replayPatch = null;
  const restoredOutbox = createSyncOutbox({ storage, key: "outbox" });
  const restoredController = createStudySyncController({
    ...base,
    outbox: restoredOutbox,
    repository: {
      updateTask: async (taskId, patch) => {
        replayPatch = { taskId, patch };
        return { task: { ...task, ...patch, id: taskId, clientId: "task-local", updatedAt: "server-v2" } };
      },
    },
  });
  const result = await restoredController.flushOutbox({ force: true });

  assert.equal(result.failed, 0);
  assert.equal(restoredOutbox.getEntries().length, 0);
  assert.equal(replayPatch.taskId, "task-cloud");
  assert.equal(replayPatch.patch.title, "离线修改后的标题");
  assert.equal(replayPatch.patch.expectedUpdatedAt, "server-v1");
  assert.equal(task.serverUpdatedAt, "server-v2");
});

test("task, goal, and settings conflicts replay local intent on the newest server version", async () => {
  const storage = new MemoryStorage();
  const taskStore = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });
  const task = {
    id: "task-cloud", syncedTaskId: "task-cloud", clientId: "task-local",
    title: "本地任务标题", completed: true, xpEarned: 10, studyGoalId: "goal-cloud",
    serverUpdatedAt: "task-v1",
  };
  taskStore.addTask("2026-07-22", task);
  const goal = {
    id: "goal-cloud", syncedGoalId: "goal-cloud", clientId: "goal-local",
    title: "本地目标标题", description: "本地说明", targetMinutes: 1000,
    weeklyTargetMinutes: 300, targetDate: null, isPrimary: true, completed: false,
    serverUpdatedAt: "goal-v1",
  };
  const data = {
    focusDuration: 60, dailyGoal: 9, theme: "dark", nextRestType: "short",
    currentTaskId: task.id, currentStudyGoalId: goal.id, longGoalOnboardingCompleted: true,
    settingsUpdatedAt: "settings-v1", records: [], petProgress: {},
  };
  const calls = { task: [], goal: [], settings: [] };
  const conflict = (code, entityName, entity) => {
    const error = new Error("conflict");
    error.code = code;
    error.details = { [entityName]: entity };
    return error;
  };
  let appliedSettings = null;
  const controller = createStudySyncController({
    repository: {
      updateTask: async (id, patch) => {
        calls.task.push(patch);
        if (calls.task.length === 1) throw conflict("TASK_VERSION_CONFLICT", "task", { updatedAt: "task-v2", xpEarned: 20 });
        return { task: { ...task, ...patch, id, clientId: task.clientId, updatedAt: "task-v3" } };
      },
      updateStudyGoal: async (id, patch) => {
        calls.goal.push(patch);
        if (calls.goal.length === 1) throw conflict("GOAL_VERSION_CONFLICT", "studyGoal", { updatedAt: "goal-v2" });
        return { studyGoal: { ...goal, ...patch, id, clientId: goal.clientId, updatedAt: "goal-v3" } };
      },
      updateSettings: async (settings) => {
        calls.settings.push(settings);
        if (calls.settings.length === 1) throw conflict("SETTINGS_VERSION_CONFLICT", "settings", { updatedAt: "settings-v2" });
        return { settings: { ...settings, updatedAt: "settings-v3" } };
      },
    },
    taskStore, isEnabled: () => true, getTodayData: () => data, getStudyGoals: () => [goal],
    getTodayKey: () => "2026-07-22", createFocusRecordId: () => "focus",
    onUser: () => {}, applySettings: (settings) => { appliedSettings = settings; },
    applyPet: () => {}, applyTasks: () => {}, applyStudyGoals: () => {}, applyFocusSessions: () => {},
    replaceStudyGoal: () => {}, onTaskIdentityChanged: () => {}, saveToday: () => {},
    savePlans: () => {}, onPulled: () => {},
  });

  await controller.patchTask(task, { title: task.title, completed: true, xpEarned: 10 });
  const updatedGoal = await controller.updateStudyGoal(goal.id, { title: goal.title });
  await controller.syncSettings();

  assert.equal(calls.task[0].expectedUpdatedAt, "task-v1");
  assert.equal(calls.task[1].expectedUpdatedAt, "task-v2");
  assert.equal(calls.task[1].xpEarned, 20);
  assert.equal(calls.goal[0].expectedUpdatedAt, "goal-v1");
  assert.equal(calls.goal[1].expectedUpdatedAt, "goal-v2");
  assert.equal(updatedGoal.studyGoal.title, "本地目标标题");
  assert.equal(calls.settings[0].expectedUpdatedAt, "settings-v1");
  assert.equal(calls.settings[1].expectedUpdatedAt, "settings-v2");
  assert.equal(appliedSettings.dailyGoal, 9);
});
