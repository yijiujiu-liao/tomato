import { normalizeStudyGoal, sortStudyGoals } from "./goals.js";

export function createGoalController({
  getGoals,
  setGoals,
  getData,
  taskStore,
  createGoalId,
  saveGoals,
  saveData,
  savePlans,
  renderGoals,
  updateOptions,
  syncController,
  runCloudSync,
  confirmDelete = (message) => window.confirm(message),
}) {
  function replace(currentId, nextGoal) {
    if (!nextGoal) return null;
    setGoals(getGoals().map((goal) => goal.id === currentId ? nextGoal : goal).sort(sortStudyGoals));
    const data = getData();
    if (data.currentStudyGoalId === currentId) data.currentStudyGoalId = nextGoal.id;
    data.records.forEach((record) => {
      if (record.studyGoalId === currentId) record.studyGoalId = nextGoal.id;
    });
    for (const tasks of Object.values(taskStore?.getPlans?.() || {})) {
      tasks.forEach((task) => {
        if (task.studyGoalId === currentId) task.studyGoalId = nextGoal.id;
      });
    }
    saveData(false);
    savePlans?.();
    saveGoals();
    renderGoals();
    updateOptions();
    return nextGoal;
  }

  function add(input) {
    const now = new Date().toISOString();
    const goal = normalizeStudyGoal({
      id: createGoalId(),
      clientId: "",
      title: input.title,
      description: input.description,
      targetMinutes: input.targetMinutes,
      weeklyTargetMinutes: input.weeklyTargetMinutes,
      targetDate: input.targetDate,
      isPrimary: Boolean(input.isPrimary || !getGoals().some((item) => !item.completed)),
      completed: false,
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    });
    if (!goal) return null;
    const nextGoals = goal.isPrimary
      ? getGoals().map((item) => ({ ...item, isPrimary: false }))
      : getGoals();
    setGoals([goal, ...nextGoals].sort(sortStudyGoals));
    saveGoals();
    renderGoals();
    runCloudSync(async () => {
      const created = await syncController.createStudyGoal(goal);
      replace(goal.id, normalizeStudyGoal(created.studyGoal));
    });
    return goal;
  }

  function update(goalId, patch) {
    const goal = getGoals().find((item) => item.id === goalId);
    if (!goal) return null;
    const nextGoal = normalizeStudyGoal({
      ...goal,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    if (!nextGoal) return null;
    let nextGoals = getGoals().map((item) => item.id === goalId ? nextGoal : item);
    if (nextGoal.isPrimary) {
      nextGoals = nextGoals.map((item) => item.id === goalId ? item : { ...item, isPrimary: false });
    }
    setGoals(nextGoals.sort(sortStudyGoals));
    saveGoals();
    renderGoals();
    updateOptions();
    runCloudSync(async () => {
      if (!goal.syncedGoalId) {
        const created = await syncController.createStudyGoal(nextGoal);
        replace(goal.id, normalizeStudyGoal(created.studyGoal));
        return;
      }
      const updated = await syncController.updateStudyGoal(goal.syncedGoalId, {
        title: nextGoal.title,
        description: nextGoal.description,
        targetMinutes: nextGoal.targetMinutes,
        weeklyTargetMinutes: nextGoal.weeklyTargetMinutes,
        targetDate: nextGoal.targetDate,
        isPrimary: nextGoal.isPrimary,
      });
      replace(goal.id, normalizeStudyGoal(updated.studyGoal));
    });
    return nextGoal;
  }

  function toggle(goalId) {
    const goal = getGoals().find((item) => item.id === goalId);
    if (!goal) return false;
    goal.completed = !goal.completed;
    goal.completedAt = goal.completed ? new Date().toISOString() : null;
    goal.updatedAt = new Date().toISOString();
    const data = getData();
    if (goal.completed && data.currentStudyGoalId === goal.id) {
      data.currentStudyGoalId = "";
      saveData();
    }
    let promotedGoal = null;
    if (goal.completed && goal.isPrimary) {
      goal.isPrimary = false;
      promotedGoal = getGoals().find((item) => item.id !== goal.id && !item.completed) || null;
      if (promotedGoal) promotedGoal.isPrimary = true;
    }
    saveGoals();
    renderGoals();
    runCloudSync(async () => {
      if (!goal.syncedGoalId) {
        const created = await syncController.createStudyGoal(goal);
        replace(goal.id, normalizeStudyGoal(created.studyGoal));
        return;
      }
      const updated = await syncController.updateStudyGoal(goal.syncedGoalId, {
        completed: goal.completed,
        isPrimary: goal.isPrimary,
      });
      replace(goal.id, normalizeStudyGoal(updated.studyGoal));
      if (promotedGoal?.syncedGoalId) {
        const promoted = await syncController.updateStudyGoal(promotedGoal.syncedGoalId, { isPrimary: true });
        replace(promotedGoal.id, normalizeStudyGoal(promoted.studyGoal));
      }
    });
    return true;
  }

  function remove(goalId) {
    const goal = getGoals().find((item) => item.id === goalId);
    if (!goal || !confirmDelete(`确定删除目标「${goal.title}」吗？`)) return false;
    setGoals(getGoals().filter((item) => item.id !== goalId));
    const data = getData();
    if (data.currentStudyGoalId === goalId) {
      data.currentStudyGoalId = "";
      saveData();
    }
    for (const tasks of Object.values(taskStore?.getPlans?.() || {})) {
      tasks.forEach((task) => {
        if (task.studyGoalId === goalId) task.studyGoalId = "";
      });
    }
    savePlans?.();
    saveGoals();
    renderGoals();
    updateOptions();
    syncController.cancelStudyGoal?.(goal);
    if (goal.syncedGoalId) {
      runCloudSync(() => syncController.deleteStudyGoal(goal.syncedGoalId, goal));
    }
    return true;
  }

  return { add, update, toggle, remove, replace };
}
