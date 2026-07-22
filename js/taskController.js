import {
  carryOverUnfinishedTasks,
  createLocalTask,
  delayTask,
  renameTask,
  setTaskCompleted,
} from "./tasks.js";
import { normalizeNonNegativeInteger } from "./utils.js";

export function createTaskController({
  taskStore,
  petController,
  syncController,
  getData,
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
  createTaskId,
  savePlans,
  saveData,
  renderTasks,
  renderCurrentOptions,
  renderHome,
  renderReview,
  renderPet,
  updateStartButton,
  runCloudSync,
  showToast,
  hideToast,
  switchPage,
  vibrate,
  confirmDelete = (message) => window.confirm(message),
}) {
  const getTodayTasks = () => taskStore.getTasks(getTodayKey(), { create: true });

  function refresh({ pet = false } = {}) {
    renderTasks();
    renderCurrentOptions();
    renderHome();
    renderReview();
    updateStartButton();
    if (pet) renderPet();
  }

  function add(title, studyGoalId = "") {
    const task = createLocalTask({ title, studyGoalId, id: createTaskId() });
    if (!task) return false;
    taskStore.addTask(getTodayKey(), task);
    const data = getData();
    data.currentTaskId = task.id;
    data.currentTask = task.title;
    data.currentStudyGoalId = task.studyGoalId;
    savePlans();
    saveData();
    refresh();
    runCloudSync(async () => {
      const created = await syncController.createTask(task, getTodayKey());
      syncController.applyCreatedTask(task, created.task);
      savePlans();
      renderTasks();
      renderCurrentOptions();
    });
    return true;
  }

  function edit(taskId, title) {
    const task = getTodayTasks().find((item) => item.id === taskId);
    if (!renameTask(task, title)) return false;
    const data = getData();
    if (data.currentTaskId === task.id) {
      data.currentTask = task.title;
      saveData();
    }
    savePlans();
    refresh();
    runCloudSync(() => syncController.patchTask(task, { title: task.title }));
    return true;
  }

  function remove(taskId) {
    const task = getTodayTasks().find((item) => item.id === taskId);
    if (!task || !confirmDelete(`确定删除任务「${task.title}」吗？`)) return false;
    taskStore.removeTask(getTodayKey(), taskId);
    const data = getData();
    if (data.currentTaskId === taskId) {
      data.currentTaskId = "";
      data.currentTask = "";
      data.currentStudyGoalId = "";
      saveData();
    }
    savePlans();
    refresh();
    syncController.cancelTask?.(task);
    if (task.syncedTaskId) {
      taskStore.rememberDeleted(task.syncedTaskId);
      runCloudSync(() => syncController.deleteTask(task.syncedTaskId, task));
    }
    return true;
  }

  function carryOver() {
    const tasks = carryOverUnfinishedTasks({
      store: taskStore,
      fromDateKey: getYesterdayKey(),
      toDateKey: getTodayKey(),
      createId: createTaskId,
    });
    savePlans();
    renderTasks();
    renderCurrentOptions();
    runCloudSync(async () => {
      for (const task of tasks) {
        const created = await syncController.createTask(task, getTodayKey());
        syncController.applyCreatedTask(task, created.task);
      }
      savePlans();
      renderTasks();
      renderCurrentOptions();
    });
    return tasks;
  }

  function complete(taskId) {
    const task = getTodayTasks().find((item) => item.id === taskId);
    if (!task || task.completed) return false;
    setTaskCompleted(task, true);
    const alreadyRewarded = normalizeNonNegativeInteger(task.xpEarned) > 0;
    const reward = alreadyRewarded
      ? { totalXP: 0, bonusPercent: 0, leveledUp: false, evolved: false }
      : petController.addXP(10);
    if (!alreadyRewarded) task.xpEarned = reward.totalXP;
    vibrate();
    const data = getData();
    if (data.currentTaskId === task.id) {
      data.currentTaskId = "";
      data.currentTask = "";
      data.currentStudyGoalId = "";
      saveData();
    }
    savePlans();
    saveData();
    refresh({ pet: true });
    runCloudSync(async () => {
      await syncController.patchTask(task, { completed: true, xpEarned: task.xpEarned });
      await syncController.syncPet();
    });
    const completionMessage = alreadyRewarded
      ? "任务再次完成，本次不重复获得 XP。"
      : task.source === "ai"
      ? `AI 承接任务完成！宠物 +${reward.totalXP} XP，今晚复盘会据此调整计划。`
      : `任务完成！宠物获得 +${reward.totalXP} XP`;
    showToast(completionMessage, () => restore(task.id));
    switchPage("review");
    return { task, reward };
  }

  function delay(taskId) {
    const todayKey = getTodayKey();
    const tomorrowKey = getTomorrowKey();
    const result = delayTask({
      store: taskStore,
      fromDateKey: todayKey,
      toDateKey: tomorrowKey,
      taskId,
      createId: createTaskId,
    });
    if (!result.task) return false;
    const data = getData();
    if (data.currentTaskId === result.task.id) {
      data.currentTaskId = "";
      data.currentTask = "";
      data.currentStudyGoalId = "";
      saveData();
    }
    savePlans();
    refresh();
    vibrate();
    showToast("已延期到明天。");
    if (result.task.syncedTaskId) taskStore.rememberDeleted(result.task.syncedTaskId);
    runCloudSync(async () => {
      syncController.cancelTask?.(result.task);
      if (result.task.syncedTaskId) await syncController.deleteTask(result.task.syncedTaskId, result.task);
      if (result.delayedTask) {
        const created = await syncController.createTask(result.delayedTask, tomorrowKey);
        syncController.applyCreatedTask(result.delayedTask, created.task);
        savePlans();
      }
    });
    return result;
  }

  function restore(taskId) {
    const task = getTodayTasks().find((item) => item.id === taskId);
    if (!task) return false;
    setTaskCompleted(task, false);
    const data = getData();
    if (!data.currentTaskId) {
      data.currentTaskId = task.id;
      data.currentTask = task.title;
      data.currentStudyGoalId = task.studyGoalId || "";
      saveData();
    }
    savePlans();
    refresh({ pet: true });
    runCloudSync(async () => {
      await syncController.patchTask(task, { completed: false });
      await syncController.syncPet();
    });
    hideToast();
    return true;
  }

  function select(taskId, { navigate = false } = {}) {
    const task = getTodayTasks().find((item) => item.id === taskId && !item.completed) || null;
    const data = getData();
    data.currentTaskId = task?.id || "";
    data.currentTask = task?.title || "";
    data.currentStudyGoalId = task?.studyGoalId || "";
    saveData();
    renderCurrentOptions();
    renderTasks();
    renderHome();
    renderReview();
    updateStartButton();
    runCloudSync(() => syncController.syncSettings());
    if (navigate) switchPage("home");
    return task;
  }

  function assignGoal(taskId, studyGoalId) {
    const task = getTodayTasks().find((item) => item.id === taskId && !item.completed);
    if (!task || !studyGoalId) return false;
    task.studyGoalId = studyGoalId;
    const data = getData();
    if (data.currentTaskId === task.id) data.currentStudyGoalId = studyGoalId;
    savePlans();
    saveData();
    refresh();
    runCloudSync(() => syncController.patchTask(task, { studyGoalId }));
    return true;
  }

  return { add, edit, remove, carryOver, complete, delay, restore, select, assignGoal };
}
