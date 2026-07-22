import {
  inferTodayXP,
  normalizeTodayXP,
} from "../focusRecords.js";
import {
  buildReviewModel,
  renderRecordsView,
  renderReviewPageView,
} from "../pages/review.js";
import { renderHomePage as renderHomePageView } from "../pages/home.js";
import {
  resolveCurrentTask,
  sortTasks,
} from "../tasks.js";

export function createRenderCoordinator({
  elements,
  timerEngine,
  timerView,
  focusSessionView,
  petView,
  statsController,
  getData,
  getGoals,
  getTasks,
  getModes,
  getRestMinutes,
  getMessageIndex,
  formatDate,
  saveData,
  renderTasks,
  renderGoals,
  updateTaskOptions,
  updateGoalOptions,
  renderDiagnosis,
  renderAi,
  showToast,
  document,
}) {
  function getCurrentTask() {
    const data = getData();
    return getTasks().find((task) => task.id === data.currentTaskId) || null;
  }

  function getStartableTask() {
    const data = getData();
    if (!data.currentTaskId) {
      return null;
    }
    return getTasks().find((task) => (
      task.id === data.currentTaskId
      && !task.completed
      && task.studyGoalId
      && getGoals().some((goal) => (
        goal.id === task.studyGoalId && !goal.completed
      ))
    )) || null;
  }

  function ensureCurrentTask() {
    const state = timerEngine.getState();
    if (state.running || state.mode !== "focus") {
      return;
    }
    const data = getData();
    const selection = resolveCurrentTask(getTasks(), data.currentTaskId);
    if (!selection.changed) {
      return;
    }
    data.currentTaskId = selection.task?.id || "";
    data.currentTask = selection.task?.title || "";
    data.currentStudyGoalId = selection.task?.studyGoalId || "";
    saveData();
  }

  function ensureStartableTask() {
    const data = getData();
    const selected = getStartableTask();
    if (selected) {
      data.currentTask = selected.title;
      saveData();
      return selected;
    }

    const selectedWithoutGoal = getTasks().find((task) => (
      task.id === data.currentTaskId && !task.completed && !task.studyGoalId
    ));
    if (selectedWithoutGoal) {
      document.querySelector(".focus-round-settings")?.setAttribute("open", "");
      showToast("请先选择这项任务要推进的长期目标。");
      return null;
    }

    const nextTask = sortTasks(
      getTasks().filter((task) => !task.completed),
      data.currentTaskId,
    )[0];
    if (!nextTask) {
      data.currentTaskId = "";
      data.currentTask = "";
      saveData();
      updateTaskOptions();
      return null;
    }

    data.currentTaskId = nextTask.id;
    data.currentTask = nextTask.title;
    data.currentStudyGoalId = nextTask.studyGoalId || "";
    saveData();
    updateTaskOptions();
    renderHome();
    renderTasks();

    const hasGoal = nextTask.studyGoalId && getGoals().some((goal) => (
      goal.id === nextTask.studyGoalId && !goal.completed
    ));
    if (!hasGoal) {
      document.querySelector(".focus-round-settings")?.setAttribute("open", "");
      showToast("请先为这项任务选择一个长期目标。");
      return null;
    }
    return nextTask;
  }

  function renderHome() {
    renderHomePageView({
      elements: elements.home,
      tasks: getTasks(),
      todayData: getData(),
      studyGoals: getGoals(),
      formatPlanDate: formatDate,
      messageIndex: getMessageIndex(),
    });
  }

  function renderTimer() {
    const data = getData();
    const state = timerEngine.getState();
    const modes = getModes();
    const totalSeconds = modes[state.mode].minutes * 60;
    const task = getCurrentTask();
    const goalTitle = getGoals().find(
      (goal) => goal.id === task?.studyGoalId,
    )?.title || "";

    if (elements.timerSummary) {
      elements.timerSummary.textContent =
        `${data.focusDuration} 分钟 · 休息 ${getRestMinutes()} 分钟`;
    }
    timerView.render({
      mode: state.mode,
      remainingSeconds: state.remainingSeconds,
      totalSeconds,
      hasTask: Boolean(getStartableTask()),
      running: state.running,
      restType: data.nextRestType,
      restMinutes: modes.rest.minutes,
    });
    focusSessionView.render({
      mode: state.mode,
      remainingSeconds: state.remainingSeconds,
      totalSeconds,
      running: state.running,
      taskTitle: data.currentTask,
      goalTitle,
      progress: data.petProgress,
      selectedPet: data.selectedPet,
    });
  }

  function renderStats() {
    const data = getData();
    elements.getDataView()?.renderTodayStats(data);
    renderDiagnosis();
    statsController.render();
    renderAi();
  }

  function renderGoalProgress() {
    const data = getData();
    const percent = Math.min(
      100,
      Math.round((data.completedCount / data.dailyGoal) * 100),
    );
    elements.goalProgressText.textContent =
      `${data.completedCount} / ${data.dailyGoal} 个番茄`;
    elements.goalProgressFill.style.width = `${percent}%`;
  }

  function renderRecords() {
    renderRecordsView(
      elements.records,
      getData().records,
      (goalId) => getGoals().find((goal) => goal.id === goalId)?.title || "",
    );
  }

  function renderReview() {
    const data = getData();
    const model = buildReviewModel({
      tasks: getTasks(),
      records: data.records,
      completedCount: data.completedCount,
      nextTask: elements.getReviewTask(),
    });
    renderReviewPageView(elements.review, model);
  }

  function renderPetPicker() {
    const data = getData();
    const state = timerEngine.getState();
    petView.renderPicker({
      selectedPet: data.selectedPet,
      isLocked: state.running && state.mode === "focus",
      onSelect: elements.onSelectPet,
    });
  }

  function renderPet() {
    const data = getData();
    const progress = data.petProgress;
    const todayXP = normalizeTodayXP(
      data.todayPetXP ?? inferTodayXP(data.records),
      progress.totalXP,
    );
    petView.renderProgress({
      progress,
      selectedPet: data.selectedPet,
      todayXP,
      streak: data.streak,
      focusMinutes: data.focusDuration || getModes().focus.minutes,
      description: elements.getPetDescription(),
    });
  }

  function renderAll() {
    ensureCurrentTask();
    renderHome();
    renderTimer();
    renderStats();
    renderGoalProgress();
    renderTasks();
    renderReview();
    updateTaskOptions();
    renderGoals();
    updateGoalOptions();
    renderRecords();
    renderPetPicker();
    renderPet();
  }

  return {
    ensureCurrentTask,
    ensureStartableTask,
    getStartableTask,
    renderAll,
    renderGoalProgress,
    renderHome,
    renderPet,
    renderPetPicker,
    renderRecords,
    renderReview,
    renderStats,
    renderTimer,
  };
}
