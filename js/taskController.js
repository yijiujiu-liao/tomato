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

  function add(title) {
    const task = createLocalTask({ title, id: createTaskId() });
    if (!task) return false;
    taskStore.addTask(getTodayKey(), task);
    const data = getData();
    data.currentTaskId = task.id;
    data.currentTask = task.title;
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
    renderTasks();
    renderCurrentOptions();
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
      saveData();
    }
    savePlans();
    renderTasks();
    renderCurrentOptions();
    if (task.syncedTaskId) {
      taskStore.rememberDeleted(task.syncedTaskId);
      runCloudSync(() => syncController.deleteTask(task.syncedTaskId));
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
    const reward = petController.addXP(10);
    task.xpEarned = reward.totalXP;
    vibrate();
    const data = getData();
    if (data.currentTaskId === task.id) {
      data.currentTaskId = "";
      data.currentTask = "";
      saveData();
    }
    savePlans();
    saveData();
    refresh({ pet: true });
    runCloudSync(async () => {
      await syncController.patchTask(task, { completed: true });
      await syncController.syncPet();
    });
    showToast(`任务完成！宠物获得 +${reward.totalXP} XP`, () => restore(task.id));
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
      saveData();
    }
    savePlans();
    refresh();
    vibrate();
    showToast("已延期到明天。");
    if (result.task.syncedTaskId) taskStore.rememberDeleted(result.task.syncedTaskId);
    runCloudSync(async () => {
      if (result.task.syncedTaskId) await syncController.deleteTask(result.task.syncedTaskId);
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
    const xp = normalizeNonNegativeInteger(task.xpEarned);
    task.xpEarned = 0;
    petController.removeXP(xp);
    const data = getData();
    if (!data.currentTaskId) {
      data.currentTaskId = task.id;
      data.currentTask = task.title;
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

  return { add, edit, remove, carryOver, complete, delay, restore, select };
}
