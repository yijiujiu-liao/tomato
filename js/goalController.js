import { normalizeStudyGoal, sortStudyGoals } from "./goals.js";

export function createGoalController({
  getGoals,
  setGoals,
  getData,
  createGoalId,
  saveGoals,
  saveData,
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
    saveData(false);
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
      targetMinutes: input.targetMinutes,
      targetDate: input.targetDate,
      completed: false,
      createdAt: now,
      completedAt: null,
      updatedAt: now,
    });
    if (!goal) return null;
    setGoals([goal, ...getGoals()]);
    saveGoals();
    renderGoals();
    runCloudSync(async () => {
      const created = await syncController.createStudyGoal(goal);
      replace(goal.id, normalizeStudyGoal(created.studyGoal));
    });
    return goal;
  }

  function toggle(goalId) {
    const goal = getGoals().find((item) => item.id === goalId);
    if (!goal) return false;
    goal.completed = !goal.completed;
    goal.completedAt = goal.completed ? new Date().toISOString() : null;
    goal.updatedAt = new Date().toISOString();
    saveGoals();
    renderGoals();
    runCloudSync(async () => {
      if (!goal.syncedGoalId) {
        const created = await syncController.createStudyGoal(goal);
        replace(goal.id, normalizeStudyGoal(created.studyGoal));
        return;
      }
      const updated = await syncController.updateStudyGoal(goal.syncedGoalId, { completed: goal.completed });
      replace(goal.id, normalizeStudyGoal(updated.studyGoal));
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
    saveGoals();
    renderGoals();
    updateOptions();
    if (goal.syncedGoalId) {
      runCloudSync(() => syncController.deleteStudyGoal(goal.syncedGoalId));
    }
    return true;
  }

  return { add, toggle, remove, replace };
}
