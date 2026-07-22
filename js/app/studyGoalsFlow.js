import { createCurrentGoalView } from "../components/currentGoal.js";
import { createStudyGoalsView } from "../components/studyGoals.js";
import { getPrimaryStudyGoal } from "../goals.js";

export function createStudyGoalsFlow({
  listMount,
  currentGoalMount,
  getController,
  getGoals,
  getData,
  saveData,
  ensureLongGoal,
  taskController,
  syncSettings,
  runCloudSync,
  taskGoalSelects = [],
}) {
  let goalsView = null;
  let currentGoalView = null;

  function setupList() {
    if (!listMount || goalsView) return;
    goalsView = createStudyGoalsView({
      mount: listMount,
      onAdd: add,
      onToggle: toggle,
      onDelete: remove,
      onUpdate: update,
    });
    render();
  }

  function setupCurrentGoal() {
    if (currentGoalView) return;
    currentGoalView = createCurrentGoalView({
      mount: currentGoalMount,
      onChange: updateCurrentSelection,
    });
    updateCurrentOptions();
  }

  function add(goalInput) {
    const goal = getController().add(goalInput);
    if (!goal) return null;

    const data = getData();
    data.longGoalOnboardingCompleted = true;
    if (!data.currentStudyGoalId) data.currentStudyGoalId = goal.id;
    saveData();
    refreshTaskSelectors();
    return goal;
  }

  function update(goalId, patch) {
    return getController().update(goalId, patch);
  }

  function toggle(goalId) {
    const changed = getController().toggle(goalId);
    if (changed) ensureLongGoal();
    return changed;
  }

  function remove(goalId) {
    const removed = getController().remove(goalId);
    if (removed) ensureLongGoal();
    return removed;
  }

  function render() {
    goalsView?.render(getGoals());
    refreshTaskSelectors();
  }

  function updateCurrentOptions() {
    if (!currentGoalView) return;
    const data = getData();
    const result = currentGoalView.render(getGoals(), data.currentStudyGoalId);
    if (result.changed) {
      data.currentStudyGoalId = "";
      saveData();
    }
  }

  function refreshTaskSelectors() {
    const data = getData();
    const activeGoals = getGoals().filter((goal) => !goal.completed);
    const preferredId = data.currentStudyGoalId || getPrimaryStudyGoal(activeGoals)?.id || "";

    taskGoalSelects.forEach((select) => {
      if (!select) return;
      const previous = select.value;
      select.replaceChildren();
      if (activeGoals.length === 0) {
        select.appendChild(new Option("先建立长期目标", ""));
        select.disabled = true;
        return;
      }

      select.disabled = false;
      activeGoals.forEach((goal) => {
        const prefix = goal.isPrimary ? "主目标 · " : "";
        select.appendChild(new Option(`${prefix}${goal.title}`, goal.id));
      });
      select.value = activeGoals.some((goal) => goal.id === previous) ? previous : preferredId;
    });
  }

  function updateCurrentSelection(goalId) {
    const goal = getGoals().find((item) => item.id === goalId);
    if (!goal) return;

    const data = getData();
    if (data.currentTaskId) {
      taskController.assignGoal(data.currentTaskId, goal.id);
      return;
    }

    data.currentStudyGoalId = goal.id;
    saveData();
    runCloudSync(syncSettings);
  }

  return {
    setupList,
    setupCurrentGoal,
    add,
    update,
    toggle,
    remove,
    render,
    updateCurrentOptions,
    refreshTaskSelectors,
    getPanel: () => goalsView?.panel || null,
  };
}
