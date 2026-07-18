import { normalizeStudyGoal } from "./goals.js";
import { normalizeTask } from "./tasks.js";

export function createStudySyncController({
  repository,
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
    await flushDeletedTasks();
    await uploadStudyGoals();
    await uploadTasks();
    await syncSettings();
    await syncPet();
    await uploadFocusRecords();
  }

  async function uploadFocusRecords() {
    const data = getTodayData();
    for (const record of data.records || []) {
      if (record.syncedSessionId) continue;
      const created = await repository.createFocusSession({
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
      record.id = created.focusSession.clientId || record.id || created.focusSession.id;
      record.syncedSessionId = created.focusSession.id;
    }
    saveToday(false);
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
    return repository.createStudyGoal(goal);
  }

  function updateStudyGoal(goalId, patch) {
    return repository.updateStudyGoal(goalId, patch);
  }

  function deleteStudyGoal(goalId) {
    return repository.deleteStudyGoal(goalId);
  }

  async function syncSettings() {
    if (!isEnabled()) return;
    const data = getTodayData();
    await repository.updateSettings({
      focusDuration: data.focusDuration,
      dailyGoal: data.dailyGoal,
      theme: data.theme,
      nextRestType: data.nextRestType,
      currentTaskId: data.currentTaskId,
      currentStudyGoalId: data.currentStudyGoalId,
      longGoalOnboardingCompleted: Boolean(data.longGoalOnboardingCompleted),
    });
  }

  async function syncPet() {
    if (!isEnabled()) return;
    const data = getTodayData();
    const localPet = {
      petId: data.petProgress.petId || data.selectedPet,
      level: data.petProgress.level,
      currentXP: data.petProgress.currentXP,
      totalXP: data.petProgress.totalXP,
      updatedAt: data.petProgress.lastUpdated,
    };

    try {
      const result = await repository.updatePet(localPet);
      applyPet(result.pet);
      return result.pet;
    } catch (error) {
      if (error.code !== "PET_VERSION_CONFLICT") throw error;
      const { pet: cloudPet } = await repository.getPet();
      if ((Number(cloudPet.totalXP) || 0) >= localPet.totalXP) {
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
    return repository.createTask(task, dateKey);
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
    });
    if (!normalized) return null;
    Object.assign(localTask, normalized);
    remapFocusRecordReference("taskId", previousId, normalized.id);
    onTaskIdentityChanged(previousId, normalized);
    return normalized;
  }

  function remapFocusRecordReference(field, previousId, nextId) {
    if (!previousId || !nextId || previousId === nextId) return;
    const data = getTodayData();

    for (const record of data.records || []) {
      if (record[field] === previousId) {
        record[field] = nextId;
      }
    }

    if (field === "taskId" && data.currentTaskId === previousId) {
      data.currentTaskId = nextId;
    }

    if (field === "studyGoalId" && data.currentStudyGoalId === previousId) {
      data.currentStudyGoalId = nextId;
    }

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

  async function patchTask(task, patch, dateKey = getTodayKey()) {
    if (!task.syncedTaskId) {
      const created = await createTask(task, dateKey);
      applyCreatedTask(task, created.task);
    }
    const updated = await repository.updateTask(task.syncedTaskId || task.id, patch);
    applyCreatedTask(task, updated.task);
    savePlans();
  }

  async function deleteTask(taskId) {
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

  return {
    pull,
    push,
    uploadFocusRecords,
    uploadStudyGoals,
    createStudyGoal,
    updateStudyGoal,
    deleteStudyGoal,
    syncSettings,
    syncPet,
    uploadTasks,
    createTask,
    applyCreatedTask,
    patchTask,
    deleteTask,
    flushDeletedTasks,
  };
}
