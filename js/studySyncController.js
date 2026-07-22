import { normalizeStudyGoal } from "./goals.js";
import { normalizeTask } from "./tasks.js";

const OUTBOX_PRIORITY = {
  "goal.upsert": 10,
  "task.upsert": 20,
  "settings.upsert": 30,
  "pet.upsert": 40,
  "focus.create": 50,
  "task.delete": 60,
  "goal.delete": 70,
};

export function createStudySyncController({
  repository,
  outbox = createTransientOutbox(),
  taskStore,
  isEnabled,
  getTodayData,
  getStudyGoals,
  getTodayKey,
  createFocusRecordId,
  onUser,
  applySettings,
  applyPet,
  applyTasks,
  applyStudyGoals,
  applyFocusSessions,
  replaceStudyGoal,
  onTaskIdentityChanged,
  saveToday,
  savePlans,
  onPulled,
}) {
  async function pull() {
    const data = await repository.pullState();
    if (data.user) onUser(data.user);
    applySettings(data.settings);
    applyPet(data.pet);
    applyTasks(data.tasks || []);
    applyStudyGoals(data.studyGoals || []);
    applyFocusSessions(data.focusSessions || []);
    onPulled();
  }

  async function push() {
    if (!isEnabled()) return;
    const replay = await flushOutbox({ force: true });
    if (replay.failed) throw replay.error;
    await flushDeletedTasks();
    await uploadStudyGoals();
    await uploadTasks();
    await syncSettings();
    await syncPet();
    await uploadFocusRecords();
  }

  async function flushOutbox({ force = false } = {}) {
    if (!isEnabled()) return { processed: 0, failed: 0, pending: outbox.getEntries().length };
    const entries = outbox.getReady({ force }).sort((first, second) => (
      (OUTBOX_PRIORITY[first.type] || 999) - (OUTBOX_PRIORITY[second.type] || 999)
      || first.createdAt - second.createdAt
    ));
    let processed = 0;

    for (const entry of entries) {
      try {
        await replayEntry(entry);
        outbox.remove(entry.id);
        processed += 1;
      } catch (error) {
        outbox.markFailed(entry.id, error);
        return {
          processed,
          failed: 1,
          pending: outbox.getEntries().length,
          error,
        };
      }
    }

    return { processed, failed: 0, pending: outbox.getEntries().length };
  }

  async function replayEntry(entry) {
    const { payload } = entry;
    if (entry.type === "settings.upsert") return syncSettingsSnapshot(payload.settings);
    if (entry.type === "pet.upsert") return syncPetSnapshot(payload.pet);
    if (entry.type === "task.delete") return deleteTaskRemote(payload.taskId);
    if (entry.type === "goal.delete") return deleteGoalRemote(payload.goalId);
    if (entry.type === "focus.create") return createFocusRecordRemote(payload.record);

    if (entry.type === "task.upsert") {
      const match = findLocalTask(payload.taskKey);
      if (!match) return null;
      return upsertTaskRemote(match.task, match.dateKey);
    }

    if (entry.type === "goal.upsert") {
      const goal = findLocalGoal(payload.goalKey);
      if (!goal) return null;
      return upsertGoalRemote(goal);
    }

    return null;
  }

  async function runQueued(command, operation) {
    const entry = outbox.enqueue(command);
    try {
      const result = await operation();
      outbox.remove(entry.id);
      return result;
    } catch (error) {
      outbox.markFailed(entry.id, error);
      throw error;
    }
  }

  async function uploadFocusRecords() {
    const data = getTodayData();
    for (const record of data.records || []) {
      if (record.syncedSessionId) continue;
      await syncFocusRecord(record);
    }
  }

  async function syncFocusRecord(record) {
    const nextRecord = { ...record, id: record.id || createFocusRecordId() };
    const result = await runQueued(focusCommand(nextRecord), () => createFocusRecordRemote(nextRecord));
    record.id = result.focusSession.clientId || record.id || result.focusSession.id;
    record.syncedSessionId = result.focusSession.id;
    saveToday(false);
    return result;
  }

  async function createFocusRecordRemote(record) {
    const result = await repository.createFocusSession({
      clientId: record.id || createFocusRecordId(),
      taskId: record.taskId || null,
      studyGoalId: record.studyGoalId || null,
      taskTitle: record.task,
      minutes: record.minutes,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
      dateKey: record.dateKey || getTodayKey(),
      streak: record.streak,
      xpEarned: record.xpEarned || record.minutes,
    });
    const localRecord = (getTodayData().records || []).find((item) => item.id === record.id);
    if (localRecord) {
      localRecord.syncedSessionId = result.focusSession.id;
      saveToday(false);
    }
    return result;
  }

  async function uploadStudyGoals() {
    for (const goal of getStudyGoals()) {
      if (goal.syncedGoalId) continue;
      const previousId = goal.id;
      const created = await createStudyGoal(goal);
      const normalized = normalizeStudyGoal(created.studyGoal);
      replaceStudyGoal(previousId, normalized);
      remapFocusRecordReference("studyGoalId", previousId, normalized?.id);
      remapTaskGoalReference(previousId, normalized?.id);
    }
  }

  function createStudyGoal(goal) {
    return runQueued(goalCommand(goal), () => repository.createStudyGoal(goal));
  }

  function updateStudyGoal(goalId, patch) {
    const goal = findLocalGoal(goalId);
    const command = goalCommand(goal || { id: goalId, syncedGoalId: goalId, ...patch });
    return runQueued(command, () => updateGoalWithConflict(goalId, {
      ...patch,
      expectedUpdatedAt: goal?.serverUpdatedAt || undefined,
    }));
  }

  function deleteStudyGoal(goalId, goal = null) {
    if (goal) outbox.cancel(`goal:${getGoalKey(goal)}`);
    return runQueued({
      type: "goal.delete",
      dedupeKey: `goal-delete:${goalId}`,
      payload: { goalId },
    }, () => deleteGoalRemote(goalId));
  }

  function cancelStudyGoal(goal) {
    if (goal) outbox.cancel(`goal:${getGoalKey(goal)}`);
  }

  async function upsertGoalRemote(goal) {
    if (!goal.syncedGoalId) {
      const previousId = goal.id;
      const result = await repository.createStudyGoal(goal);
      const normalized = normalizeStudyGoal(result.studyGoal);
      replaceStudyGoal(previousId, normalized);
      remapFocusRecordReference("studyGoalId", previousId, normalized?.id);
      remapTaskGoalReference(previousId, normalized?.id);
      return result;
    }
    const result = await updateGoalWithConflict(goal.syncedGoalId, buildGoalPatch(goal));
    replaceStudyGoal(goal.id, normalizeStudyGoal(result.studyGoal));
    return result;
  }

  async function updateGoalWithConflict(goalId, patch) {
    try {
      return await repository.updateStudyGoal(goalId, patch);
    } catch (error) {
      if (error.code !== "GOAL_VERSION_CONFLICT") throw error;
      const current = error.details?.studyGoal;
      if (!current?.updatedAt) throw error;
      return repository.updateStudyGoal(goalId, {
        ...patch,
        expectedUpdatedAt: current.updatedAt,
      });
    }
  }

  async function deleteGoalRemote(goalId) {
    try {
      return await repository.deleteStudyGoal(goalId);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async function syncSettings() {
    if (!isEnabled()) return;
    const settings = getSettingsSnapshot();
    return runQueued({
      type: "settings.upsert",
      dedupeKey: "settings",
      payload: { settings },
    }, () => syncSettingsSnapshot(settings));
  }

  async function syncSettingsSnapshot(settings) {
    try {
      const result = await repository.updateSettings(settings);
      applySettings(result.settings);
      return result.settings;
    } catch (error) {
      if (error.code !== "SETTINGS_VERSION_CONFLICT") throw error;
      const current = error.details?.settings || (await repository.getSettings()).settings;
      const result = await repository.updateSettings({
        ...settings,
        expectedUpdatedAt: current.updatedAt,
      });
      applySettings(result.settings);
      return result.settings;
    }
  }

  async function syncPet() {
    if (!isEnabled()) return;
    const pet = getPetSnapshot();
    return runQueued({
      type: "pet.upsert",
      dedupeKey: "pet",
      payload: { pet },
    }, () => syncPetSnapshot(pet));
  }

  async function syncPetSnapshot(localPet) {
    try {
      const result = await repository.updatePet(localPet);
      applyPet(result.pet);
      return result.pet;
    } catch (error) {
      if (error.code !== "PET_VERSION_CONFLICT") throw error;
      const { pet: cloudPet } = await repository.getPet();
      if ((Number(cloudPet.totalXP) || 0) >= (Number(localPet.totalXP) || 0)) {
        applyPet(cloudPet);
        return cloudPet;
      }
      const result = await repository.updatePet({ ...localPet, updatedAt: cloudPet.updatedAt });
      applyPet(result.pet);
      return result.pet;
    }
  }

  async function uploadTasks() {
    for (const [dateKey, tasks] of Object.entries(taskStore.getPlans())) {
      for (const task of tasks) {
        if (task.syncedTaskId) continue;
        const created = await createTask(task, dateKey);
        applyCreatedTask(task, created.task);
      }
    }
    savePlans();
  }

  function createTask(task, dateKey = getTodayKey()) {
    return runQueued(taskCommand(task, dateKey), () => repository.createTask(task, dateKey));
  }

  function applyCreatedTask(localTask, cloudTask) {
    const previousId = localTask.id;
    const normalized = normalizeTask({
      ...cloudTask,
      clientId: cloudTask.clientId || localTask.clientId || localTask.id,
      syncedTaskId: cloudTask.id,
      xpEarned: cloudTask.xpEarned ?? localTask.xpEarned,
      source: cloudTask.source || localTask.source,
      sourceLabel: cloudTask.sourceLabel || localTask.sourceLabel,
      sourceDateKey: cloudTask.sourceDateKey || localTask.sourceDateKey,
      suggestedForDate: cloudTask.suggestedForDate || localTask.suggestedForDate,
      aiGeneratedAt: cloudTask.aiGeneratedAt || localTask.aiGeneratedAt,
      studyGoalId: cloudTask.studyGoalId || localTask.studyGoalId,
      serverUpdatedAt: cloudTask.updatedAt || localTask.serverUpdatedAt,
    });
    if (!normalized) return null;
    Object.assign(localTask, normalized);
    remapFocusRecordReference("taskId", previousId, normalized.id);
    onTaskIdentityChanged(previousId, normalized);
    return normalized;
  }

  async function patchTask(task, patch, dateKey = getTodayKey()) {
    return runQueued(taskCommand(task, dateKey), async () => {
      if (!task.syncedTaskId) {
        const created = await repository.createTask(task, dateKey);
        applyCreatedTask(task, created.task);
      }
      const updated = await updateTaskWithConflict(task.syncedTaskId || task.id, {
        ...patch,
        expectedUpdatedAt: task.serverUpdatedAt || undefined,
      });
      applyCreatedTask(task, updated.task);
      savePlans();
      return updated;
    });
  }

  async function upsertTaskRemote(task, dateKey) {
    if (!task.syncedTaskId) {
      const result = await repository.createTask(task, dateKey);
      applyCreatedTask(task, result.task);
      savePlans();
      return result;
    }
    const result = await updateTaskWithConflict(task.syncedTaskId, buildTaskPatch(task));
    applyCreatedTask(task, result.task);
    savePlans();
    return result;
  }

  async function updateTaskWithConflict(taskId, patch) {
    try {
      return await repository.updateTask(taskId, patch);
    } catch (error) {
      if (error.code !== "TASK_VERSION_CONFLICT") throw error;
      const current = error.details?.task;
      if (!current?.updatedAt) throw error;
      return repository.updateTask(taskId, {
        ...patch,
        xpEarned: Math.max(Number(current.xpEarned) || 0, Number(patch.xpEarned) || 0),
        expectedUpdatedAt: current.updatedAt,
      });
    }
  }

  function deleteTask(taskId, task = null) {
    if (task) outbox.cancel(`task:${getTaskKey(task)}`);
    return runQueued({
      type: "task.delete",
      dedupeKey: `task-delete:${taskId}`,
      payload: { taskId },
    }, () => deleteTaskRemote(taskId));
  }

  function cancelTask(task) {
    if (task) outbox.cancel(`task:${getTaskKey(task)}`);
  }

  async function deleteTaskRemote(taskId) {
    try {
      await repository.deleteTask(taskId);
      taskStore.forgetDeleted(taskId);
    } catch (error) {
      if (error.status === 404) {
        taskStore.forgetDeleted(taskId);
        return;
      }
      throw error;
    }
  }

  async function flushDeletedTasks() {
    for (const taskId of [...taskStore.getDeletedIds()]) await deleteTask(taskId);
  }

  function findLocalTask(key) {
    for (const [dateKey, tasks] of Object.entries(taskStore.getPlans())) {
      const task = tasks.find((item) => [item.id, item.clientId, item.syncedTaskId].includes(key));
      if (task) return { task, dateKey };
    }
    return null;
  }

  function findLocalGoal(key) {
    return getStudyGoals().find((goal) => [goal.id, goal.clientId, goal.syncedGoalId].includes(key)) || null;
  }

  function getSettingsSnapshot() {
    const data = getTodayData();
    return {
      focusDuration: data.focusDuration,
      dailyGoal: data.dailyGoal,
      theme: data.theme,
      nextRestType: data.nextRestType,
      currentTaskId: data.currentTaskId,
      currentStudyGoalId: data.currentStudyGoalId,
      longGoalOnboardingCompleted: Boolean(data.longGoalOnboardingCompleted),
      expectedUpdatedAt: data.settingsUpdatedAt || undefined,
    };
  }

  function getPetSnapshot() {
    const data = getTodayData();
    return {
      petId: data.petProgress.petId || data.selectedPet,
      level: data.petProgress.level,
      currentXP: data.petProgress.currentXP,
      totalXP: data.petProgress.totalXP,
      choiceCompleted: Boolean(data.petChoiceCompleted),
      updatedAt: data.petProgress.lastUpdated,
    };
  }

  function taskCommand(task, dateKey) {
    const taskKey = getTaskKey(task);
    return {
      type: "task.upsert",
      dedupeKey: `task:${taskKey}`,
      payload: { taskKey, dateKey },
    };
  }

  function goalCommand(goal) {
    const goalKey = getGoalKey(goal);
    return {
      type: "goal.upsert",
      dedupeKey: `goal:${goalKey}`,
      payload: { goalKey },
    };
  }

  function focusCommand(record) {
    return {
      type: "focus.create",
      dedupeKey: `focus:${record.id}`,
      payload: { record: { ...record } },
    };
  }

  function buildTaskPatch(task) {
    return {
      title: task.title,
      completed: Boolean(task.completed),
      xpEarned: Number(task.xpEarned) || 0,
      studyGoalId: task.studyGoalId || null,
      expectedUpdatedAt: task.serverUpdatedAt || undefined,
    };
  }

  function buildGoalPatch(goal) {
    return {
      title: goal.title,
      description: goal.description,
      targetMinutes: goal.targetMinutes,
      weeklyTargetMinutes: goal.weeklyTargetMinutes,
      targetDate: goal.targetDate,
      isPrimary: Boolean(goal.isPrimary),
      completed: Boolean(goal.completed),
      expectedUpdatedAt: goal.serverUpdatedAt || undefined,
    };
  }

  function remapFocusRecordReference(field, previousId, nextId) {
    if (!previousId || !nextId || previousId === nextId) return;
    const data = getTodayData();
    for (const record of data.records || []) {
      if (record[field] === previousId) record[field] = nextId;
    }
    if (field === "taskId" && data.currentTaskId === previousId) data.currentTaskId = nextId;
    if (field === "studyGoalId" && data.currentStudyGoalId === previousId) data.currentStudyGoalId = nextId;
    saveToday(false);
  }

  function remapTaskGoalReference(previousId, nextId) {
    if (!previousId || !nextId || previousId === nextId) return;
    for (const tasks of Object.values(taskStore.getPlans())) {
      for (const task of tasks) {
        if (task.studyGoalId === previousId) task.studyGoalId = nextId;
      }
    }
    savePlans();
  }

  return {
    pull,
    push,
    flushOutbox,
    getOutboxEntries: outbox.getEntries,
    uploadFocusRecords,
    syncFocusRecord,
    uploadStudyGoals,
    createStudyGoal,
    updateStudyGoal,
    deleteStudyGoal,
    cancelStudyGoal,
    syncSettings,
    syncPet,
    uploadTasks,
    createTask,
    applyCreatedTask,
    patchTask,
    deleteTask,
    cancelTask,
    flushDeletedTasks,
  };
}

function getTaskKey(task) {
  return task.clientId || task.id || task.syncedTaskId;
}

function getGoalKey(goal) {
  return goal.clientId || goal.id || goal.syncedGoalId;
}

function createTransientOutbox() {
  let entries = [];
  let sequence = 0;
  return {
    enqueue(command) {
      const existing = entries.find((entry) => entry.dedupeKey === command.dedupeKey);
      if (existing) {
        Object.assign(existing, command);
        return existing;
      }
      const entry = { ...command, id: `transient-${++sequence}`, createdAt: sequence };
      entries.push(entry);
      return entry;
    },
    remove(id) { entries = entries.filter((entry) => entry.id !== id); },
    cancel(key) { entries = entries.filter((entry) => entry.dedupeKey !== key); },
    markFailed() {},
    getReady: () => [...entries],
    getEntries: () => [...entries],
  };
}
