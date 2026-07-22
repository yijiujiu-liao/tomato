import { addHomeTask } from "../pages/home.js";
import { createTasksPageController } from "../pages/tasks.js";

export function createTaskPlanningFlow({
  elements,
  taskStore,
  taskSwipeController,
  getTaskController,
  getData,
  getGoals,
  getTodayKey,
  getYesterdayKey,
  formatPlanDate,
  saveData,
  ensureLongGoal,
  showToast,
  switchPage,
}) {
  const page = createTasksPageController({
    elements: {
      todayDateText: elements.todayDateText,
      planProgressText: elements.planProgressText,
      taskList: elements.taskList,
      planExpandButton: elements.planExpandButton,
      currentTaskSelect: elements.currentTaskSelect,
      carryOverBanner: elements.carryOverBanner,
      carryOverText: elements.carryOverText,
    },
    taskSwipeController,
    formatPlanDate,
    onFocus: focus,
    onEdit: edit,
    onDelete: remove,
    onRestore: restore,
    onComplete: complete,
    onDelay: delay,
    getGoalLabel: (goalId) => getGoals().find((goal) => goal.id === goalId)?.title || "",
  });
  page.setRenderCurrent(render);

  function getTodayTasks() {
    return taskStore.getTasks(getTodayKey(), { create: true });
  }

  function add(title, studyGoalId) {
    const goal = getGoals().find((item) => item.id === studyGoalId && !item.completed);
    if (!goal) {
      ensureLongGoal();
      showToast("先选择这个任务要推进的长期目标。");
      return false;
    }
    return getTaskController().add(title, goal.id);
  }

  function focus(taskId) {
    return getTaskController().select(taskId, { navigate: true });
  }

  function edit(taskId, title) {
    return getTaskController().edit(taskId, title);
  }

  function remove(taskId) {
    return getTaskController().remove(taskId);
  }

  function carryOver() {
    return getTaskController().carryOver();
  }

  function render() {
    const tasks = getTodayTasks();
    const yesterdayTasks = taskStore.getTasks(getYesterdayKey()).filter((task) => !task.completed);
    page.renderCarryOver(yesterdayTasks, tasks);
    page.render(tasks, getData().currentTaskId);
  }

  function toggleExpansion() {
    page.toggleExpansion();
  }

  function updateCurrentOptions({ canChange = true } = {}) {
    const data = getData();
    const result = page.renderCurrentTaskOptions(getTodayTasks(), data.currentTaskId, canChange);
    if (!result.changed) return result;

    data.currentTaskId = result.selected?.id || "";
    data.currentTask = result.selected?.title || "";
    data.currentStudyGoalId = result.selected?.studyGoalId || "";
    saveData();
    return result;
  }

  function complete(taskId) {
    page.markRecentlyCompleted(taskId);
    return getTaskController().complete(taskId);
  }

  function delay(taskId) {
    return getTaskController().delay(taskId);
  }

  function restore(taskId) {
    page.clearRecentlyCompleted();
    return getTaskController().restore(taskId);
  }

  function handleAdd() {
    const added = add(elements.newTaskInput.value, elements.newTaskGoalSelect?.value);
    if (!added) {
      elements.newTaskInput.focus();
      return;
    }
    elements.newTaskInput.value = "";
    elements.newTaskInput.focus();
  }

  function handleQuickAdd() {
    const title = elements.homeQuickTaskInput?.value.trim() || "";
    const result = addHomeTask({
      title,
      addTask: (taskTitle) => add(taskTitle, elements.homeQuickTaskGoalSelect?.value),
    });
    if (!result.added) {
      elements.homeQuickTaskInput?.focus();
      return;
    }
    elements.homeQuickTaskInput.value = "";
  }

  function handleNewTaskKeydown(event) {
    if (event.key === "Enter") handleAdd();
  }

  function updateCurrentSelection() {
    return getTaskController().select(elements.currentTaskSelect.value);
  }

  function startNext() {
    const nextTask = getTodayTasks().find((task) => !task.completed);
    if (nextTask) return focus(nextTask.id);
    switchPage("home");
  }

  return {
    getTodayTasks,
    add,
    focus,
    edit,
    remove,
    carryOver,
    render,
    toggleExpansion,
    updateCurrentOptions,
    complete,
    delay,
    restore,
    handleAdd,
    handleQuickAdd,
    handleNewTaskKeydown,
    updateCurrentSelection,
    startNext,
  };
}
